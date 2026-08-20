# Relatórios Comparativos (Meses) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/relatorios`, a page comparing faturamento/vendas/lucro/margem across a user-chosen number of months (2–12), with a top-5 produtos-mais-vendidos ranking and PDF/XML export — all client-side, no new API route.

**Architecture:** Server Component (`app/dashboard/relatorios/page.tsx`) reads `?months=`, queries `sales` (with nested `sale_items`) and `products` in one `Promise.all` (same pattern as `app/dashboard/page.tsx`), aggregates in memory via pure functions in `lib/relatorios/`, and passes the result to a Client Component (`report-view.tsx`) that renders cards/chart/tables and generates the PDF (`@react-pdf/renderer`, in-browser) and XML (hand-built string) downloads.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Recharts, `@react-pdf/renderer` (new dependency), Zod v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-relatorios-comparativos-design.md`

## Global Constraints

- `searchParams` and `params` in Next.js 16 App Router page components are `Promise`s — must `await` them (confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and already the pattern in `app/dashboard/produtos/[id]/editar/page.tsx`).
- No Server Action/query trusts a client-supplied `user_id` — reads always go through the RLS-scoped session client (`createClient()` from `lib/supabase/server`), same as every other dashboard page.
- Money values render via `value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })` — the exact helper already used in `app/dashboard/page.tsx`.
- `components/ui/button.tsx` only has variants `primary | secondary | ghost` (no `outline`) — use `secondary` for export actions.
- Recharts: CSS var tokens (`var(--color-primary)`, `var(--color-success)`) are safe in `stroke`/`fill`, but `Tooltip`'s `contentStyle`/`labelStyle` need literal hex colors — see the comment in `components/dashboard/revenue-chart.tsx` explaining why (CSS vars don't resolve correctly inside the tooltip).
- PDF generation must be 100% client-side (`@react-pdf/renderer`'s `pdf(...).toBlob()`), no Puppeteer/Chromium, no new Route Handler.
- Vitest runs with `environment: "node"` (no DOM) — pure functions only get unit tests; UI/export-button wiring is reviewed manually.

---

### Task 1: Agregação mensal (`lib/relatorios/monthly-report.ts`)

**Files:**
- Create: `lib/relatorios/monthly-report.ts`
- Test: `tests/unit/relatorios/monthly-report.test.ts`

**Interfaces:**
- Produces (used by Task 4, 5, 6, 7):
  - `interface SaleRecord { saleDate: string; grossRevenue: number; netProfit: number }`
  - `interface SaleItemRecord { productId: string; quantity: number; subtotal: number }`
  - `interface MonthlyMetric { month: string; label: string; revenue: number; salesCount: number; profit: number; margin: number; revenueChangePercent: number | null; profitChangePercent: number | null }`
  - `interface TopProduct { productId: string; name: string; quantity: number; revenue: number }`
  - `function parseMonthKey(monthKey: string): { year: number; monthIndex: number }`
  - `function formatMonthLabel(monthKey: string): string`
  - `function buildMonthRange(monthsCount: number, referenceDate: Date): string[]`
  - `function aggregateMonthlyMetrics(sales: SaleRecord[], monthKeys: string[]): MonthlyMetric[]`
  - `function rankTopProducts(items: SaleItemRecord[], productNames: Map<string, string>, limit?: number): TopProduct[]`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/relatorios/monthly-report.test.ts
import { describe, it, expect } from "vitest";
import {
  parseMonthKey,
  formatMonthLabel,
  buildMonthRange,
  aggregateMonthlyMetrics,
  rankTopProducts,
} from "@/lib/relatorios/monthly-report";

describe("parseMonthKey", () => {
  it("separa ano e índice do mês (0-based)", () => {
    expect(parseMonthKey("2026-08")).toEqual({ year: 2026, monthIndex: 7 });
  });
});

describe("formatMonthLabel", () => {
  it("formata como abreviação em pt-BR + ano", () => {
    expect(formatMonthLabel("2026-08")).toBe("ago/2026");
    expect(formatMonthLabel("2026-01")).toBe("jan/2026");
  });
});

describe("buildMonthRange", () => {
  it("retorna N meses terminando no mês de referência, do mais antigo pro mais novo", () => {
    const reference = new Date(2026, 7, 15); // 15 ago 2026
    expect(buildMonthRange(3, reference)).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("cruza a virada de ano corretamente", () => {
    const reference = new Date(2026, 1, 10); // 10 fev 2026
    expect(buildMonthRange(3, reference)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("aggregateMonthlyMetrics", () => {
  const monthKeys = ["2026-06", "2026-07", "2026-08"];

  it("soma faturamento, vendas e lucro por mês, incluindo meses sem venda", () => {
    const sales = [
      { saleDate: "2026-06-05T00:00:00.000Z", grossRevenue: 1000, netProfit: 300 },
      { saleDate: "2026-06-20T00:00:00.000Z", grossRevenue: 500, netProfit: 100 },
      { saleDate: "2026-08-01T00:00:00.000Z", grossRevenue: 2000, netProfit: 800 },
    ];

    const result = aggregateMonthlyMetrics(sales, monthKeys);

    expect(result).toEqual([
      {
        month: "2026-06",
        label: "jun/2026",
        revenue: 1500,
        salesCount: 2,
        profit: 400,
        margin: 400 / 1500,
        revenueChangePercent: null,
        profitChangePercent: null,
      },
      {
        month: "2026-07",
        label: "jul/2026",
        revenue: 0,
        salesCount: 0,
        profit: 0,
        margin: 0,
        revenueChangePercent: -1,
        profitChangePercent: -1,
      },
      {
        month: "2026-08",
        label: "ago/2026",
        revenue: 2000,
        salesCount: 1,
        profit: 800,
        margin: 0.4,
        revenueChangePercent: null,
        profitChangePercent: null,
      },
    ]);
  });

  it("mês anterior zerado e mês atual também zerado dá variação 0, não null", () => {
    const result = aggregateMonthlyMetrics([], ["2026-06", "2026-07"]);
    expect(result[1].revenueChangePercent).toBe(0);
    expect(result[1].profitChangePercent).toBe(0);
  });
});

describe("rankTopProducts", () => {
  it("ordena por quantidade desc, desempate por faturamento desc, limita ao top N", () => {
    const items = [
      { productId: "a", quantity: 10, subtotal: 100 },
      { productId: "b", quantity: 10, subtotal: 200 },
      { productId: "a", quantity: 5, subtotal: 50 },
      { productId: "c", quantity: 3, subtotal: 30 },
    ];
    const names = new Map([
      ["a", "Produto A"],
      ["b", "Produto B"],
      ["c", "Produto C"],
    ]);

    const result = rankTopProducts(items, names, 2);

    expect(result).toEqual([
      { productId: "a", name: "Produto A", quantity: 15, revenue: 150 },
      { productId: "b", name: "Produto B", quantity: 10, revenue: 200 },
    ]);
  });

  it("usa 'Produto removido' quando o nome não está no mapa", () => {
    const items = [{ productId: "x", quantity: 1, subtotal: 10 }];
    const result = rankTopProducts(items, new Map());
    expect(result[0].name).toBe("Produto removido");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/relatorios/monthly-report.test.ts`
Expected: FAIL — `lib/relatorios/monthly-report` cannot be found (module doesn't exist yet).

- [ ] **Step 3: Implement**

```typescript
// lib/relatorios/monthly-report.ts
const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export interface SaleRecord {
  saleDate: string;
  grossRevenue: number;
  netProfit: number;
}

export interface SaleItemRecord {
  productId: string;
  quantity: number;
  subtotal: number;
}

export interface MonthlyMetric {
  month: string;
  label: string;
  revenue: number;
  salesCount: number;
  profit: number;
  margin: number;
  revenueChangePercent: number | null;
  profitChangePercent: number | null;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export function formatMonthLabel(monthKey: string): string {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return `${MONTH_ABBREVIATIONS[monthIndex]}/${year}`;
}

export function buildMonthRange(monthsCount: number, referenceDate: Date): string[] {
  const keys: string[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return (current - previous) / previous;
}

export function aggregateMonthlyMetrics(sales: SaleRecord[], monthKeys: string[]): MonthlyMetric[] {
  const buckets = new Map<string, { revenue: number; salesCount: number; profit: number }>();
  for (const key of monthKeys) {
    buckets.set(key, { revenue: 0, salesCount: 0, profit: 0 });
  }

  for (const sale of sales) {
    const monthKey = sale.saleDate.slice(0, 7);
    const bucket = buckets.get(monthKey);
    if (!bucket) continue;
    bucket.revenue += sale.grossRevenue;
    bucket.salesCount += 1;
    bucket.profit += sale.netProfit;
  }

  const metrics: MonthlyMetric[] = [];
  let previous: { revenue: number; profit: number } | null = null;

  for (const key of monthKeys) {
    const bucket = buckets.get(key)!;
    const margin = bucket.revenue > 0 ? bucket.profit / bucket.revenue : 0;
    metrics.push({
      month: key,
      label: formatMonthLabel(key),
      revenue: bucket.revenue,
      salesCount: bucket.salesCount,
      profit: bucket.profit,
      margin,
      revenueChangePercent: previous ? changePercent(bucket.revenue, previous.revenue) : null,
      profitChangePercent: previous ? changePercent(bucket.profit, previous.profit) : null,
    });
    previous = { revenue: bucket.revenue, profit: bucket.profit };
  }

  return metrics;
}

export function rankTopProducts(
  items: SaleItemRecord[],
  productNames: Map<string, string>,
  limit = 5
): TopProduct[] {
  const totals = new Map<string, { quantity: number; revenue: number }>();

  for (const item of items) {
    const entry = totals.get(item.productId) ?? { quantity: 0, revenue: 0 };
    entry.quantity += item.quantity;
    entry.revenue += item.subtotal;
    totals.set(item.productId, entry);
  }

  return Array.from(totals.entries())
    .map(([productId, entry]) => ({
      productId,
      name: productNames.get(productId) ?? "Produto removido",
      quantity: entry.quantity,
      revenue: entry.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/relatorios/monthly-report.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/relatorios/monthly-report.ts tests/unit/relatorios/monthly-report.test.ts
git commit -m "feat(relatorios): adiciona agregação mensal de vendas"
```

---

### Task 2: Exportação XML (`lib/relatorios/export-xml.ts`)

**Files:**
- Create: `lib/relatorios/export-xml.ts`
- Test: `tests/unit/relatorios/export-xml.test.ts`

**Interfaces:**
- Consumes: `MonthlyMetric`, `TopProduct` from Task 1 (`@/lib/relatorios/monthly-report`)
- Produces (used by Task 7): `function buildReportXml(periodLabel: string, months: MonthlyMetric[], topProducts: TopProduct[]): string`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/relatorios/export-xml.test.ts
import { describe, it, expect } from "vitest";
import { buildReportXml } from "@/lib/relatorios/export-xml";
import type { MonthlyMetric, TopProduct } from "@/lib/relatorios/monthly-report";

const month: MonthlyMetric = {
  month: "2026-08",
  label: "ago/2026",
  revenue: 12345.67,
  salesCount: 42,
  profit: 3456.78,
  margin: 0.28,
  revenueChangePercent: 0.1,
  profitChangePercent: 0.05,
};

const product: TopProduct = {
  productId: "p1",
  name: 'Camiseta "Premium" & Cia',
  quantity: 120,
  revenue: 4800,
};

describe("buildReportXml", () => {
  it("gera XML bem formado com meses e produtos", () => {
    const xml = buildReportXml("jun/2026 a ago/2026", [month], [product]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<periodo>jun/2026 a ago/2026</periodo>");
    expect(xml).toContain('<mes referencia="2026-08">');
    expect(xml).toContain("<faturamento>12345.67</faturamento>");
    expect(xml).toContain("<vendas>42</vendas>");
    expect(xml).toContain("<lucro>3456.78</lucro>");
    expect(xml).toContain("<margem>0.2800</margem>");
  });

  it("escapa caracteres especiais no nome do produto", () => {
    const xml = buildReportXml("ago/2026", [], [product]);
    expect(xml).toContain('<produto nome="Camiseta &quot;Premium&quot; &amp; Cia">');
  });

  it("gera estrutura válida para período sem dados", () => {
    const xml = buildReportXml("ago/2026", [], []);
    expect(xml).toContain("<meses>\n\n  </meses>");
    expect(xml).toContain("<produtosMaisVendidos>\n\n  </produtosMaisVendidos>");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/relatorios/export-xml.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/relatorios/export-xml.ts
import type { MonthlyMetric, TopProduct } from "./monthly-report";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildReportXml(
  periodLabel: string,
  months: MonthlyMetric[],
  topProducts: TopProduct[]
): string {
  const mesesXml = months
    .map(
      (m) => `    <mes referencia="${m.month}">
      <faturamento>${m.revenue.toFixed(2)}</faturamento>
      <vendas>${m.salesCount}</vendas>
      <lucro>${m.profit.toFixed(2)}</lucro>
      <margem>${m.margin.toFixed(4)}</margem>
    </mes>`
    )
    .join("\n");

  const produtosXml = topProducts
    .map(
      (p) => `    <produto nome="${escapeXml(p.name)}">
      <quantidade>${p.quantity}</quantidade>
      <faturamento>${p.revenue.toFixed(2)}</faturamento>
    </produto>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<relatorio>
  <periodo>${escapeXml(periodLabel)}</periodo>
  <meses>
${mesesXml}
  </meses>
  <produtosMaisVendidos>
${produtosXml}
  </produtosMaisVendidos>
</relatorio>`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/relatorios/export-xml.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/relatorios/export-xml.ts tests/unit/relatorios/export-xml.test.ts
git commit -m "feat(relatorios): adiciona serialização XML do relatório"
```

---

### Task 3: Gráfico de comparação (`components/relatorios/comparison-chart.tsx`)

**Files:**
- Create: `components/relatorios/comparison-chart.tsx`

**Interfaces:**
- Produces (used by Task 4): `interface ComparisonChartPoint { label: string; revenue: number; profit: number }`, `function ComparisonChart({ data }: { data: ComparisonChartPoint[] }): JSX.Element`

- [ ] **Step 1: Implement the component**

```tsx
// components/relatorios/comparison-chart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface ComparisonChartPoint {
  label: string;
  revenue: number;
  profit: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ComparisonChart({ data }: { data: ComparisonChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            // Cor literal, não var(--color-*): o tooltip do Recharts não herda os
            // tokens CSS corretamente (mesmo problema já visto em revenue-chart.tsx).
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9E9F2",
              borderRadius: "10px",
            }}
            labelStyle={{ color: "#1E1B4B", fontWeight: 600 }}
          />
          <Legend />
          <Bar dataKey="revenue" name="Faturamento" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="profit" name="Lucro" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/relatorios/comparison-chart.tsx
git commit -m "feat(relatorios): adiciona gráfico de comparação mensal"
```

---

### Task 4: Visualização do relatório (`components/relatorios/report-view.tsx`)

**Files:**
- Create: `components/relatorios/report-view.tsx`

**Interfaces:**
- Consumes: `MonthlyMetric`, `TopProduct` (Task 1); `ComparisonChart`, `ComparisonChartPoint` (Task 3); `Card`/`CardHeader`/`CardTitle`/`CardContent` (`@/components/ui/card`); `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` (`@/components/ui/table`); `Select` (`@/components/ui/select`)
- Produces (used by Task 5, 6, 7): `interface ReportViewProps { periodLabel: string; monthsCount: number; months: MonthlyMetric[]; topProducts: TopProduct[] }`, `function ReportView(props: ReportViewProps): JSX.Element` (default export)

- [ ] **Step 1: Implement the component**

```tsx
// components/relatorios/report-view.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { ComparisonChart } from "@/components/relatorios/comparison-chart";
import { cn } from "@/lib/utils";
import type { MonthlyMetric, TopProduct } from "@/lib/relatorios/monthly-report";

export interface ReportViewProps {
  periodLabel: string;
  monthsCount: number;
  months: MonthlyMetric[];
  topProducts: TopProduct[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        isPositive ? "text-success" : "text-destructive"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {(value * 100).toFixed(1)}%
    </span>
  );
}

export default function ReportView({ periodLabel, monthsCount, months, topProducts }: ReportViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
  const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const lastMonth = months[months.length - 1];
  const bestMonth = months.reduce(
    (best, m) => (m.revenue > best.revenue ? m : best),
    months[0]
  );

  const chartData = months.map((m) => ({ label: m.label, revenue: m.revenue, profit: m.profit }));

  const metricRows: { label: string; values: string[]; changes: (number | null)[] }[] = [
    {
      label: "Faturamento",
      values: months.map((m) => formatCurrency(m.revenue)),
      changes: months.map((m) => m.revenueChangePercent),
    },
    {
      label: "Nº de vendas",
      values: months.map((m) => String(m.salesCount)),
      changes: months.map(() => null),
    },
    {
      label: "Lucro",
      values: months.map((m) => formatCurrency(m.profit)),
      changes: months.map((m) => m.profitChangePercent),
    },
    {
      label: "Margem",
      values: months.map((m) => `${(m.margin * 100).toFixed(1)}%`),
      changes: months.map(() => null),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Comparativo de {periodLabel}.</p>
        </div>
        <div className="w-56">
          <label htmlFor="monthsCount" className="mb-1.5 block text-sm font-medium text-foreground">
            Comparar últimos N meses
          </label>
          <Select
            id="monthsCount"
            value={monthsCount}
            onChange={(event) => router.push(`${pathname}?months=${event.target.value}`)}
          >
            {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n} meses
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento no período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Variação último mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeBadge value={lastMonth?.revenueChangePercent ?? null} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{bestMonth?.label ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem média</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{(avgMargin * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento e lucro por mês</CardTitle>
        </CardHeader>
        <CardContent>
          {months.some((m) => m.salesCount > 0) ? (
            <ComparisonChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada neste período.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparativo mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                {months.map((m) => (
                  <TableHead key={m.month}>{m.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {row.values.map((value, i) => (
                    <TableCell key={months[i].month}>
                      <div className="flex flex-col gap-0.5">
                        <span>{value}</span>
                        {row.changes[i] !== null && <ChangeBadge value={row.changes[i]} />}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos mais vendidos no período</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum produto vendido neste período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. Fix any prop-name mismatches against the real `Card`/`Table`/`Select` components before moving on.

- [ ] **Step 3: Commit**

```bash
git add components/relatorios/report-view.tsx
git commit -m "feat(relatorios): adiciona visualização comparativa (cards, gráfico, tabelas)"
```

---

### Task 5: Página do relatório + navegação

**Files:**
- Create: `app/dashboard/relatorios/page.tsx`
- Create: `lib/validations/relatorios.ts`
- Modify: `components/dashboard/sidebar.tsx`

**Interfaces:**
- Consumes: `buildMonthRange`, `aggregateMonthlyMetrics`, `rankTopProducts`, `SaleRecord`, `SaleItemRecord` (Task 1); `ReportView`, `ReportViewProps` (Task 4)

- [ ] **Step 1: Add the validation schema**

```typescript
// lib/validations/relatorios.ts
import { z } from "zod";

export const reportMonthsSchema = z.coerce.number().int().min(2).max(12).catch(3);
```

- [ ] **Step 2: Build the page**

```tsx
// app/dashboard/relatorios/page.tsx
import { createClient } from "@/lib/supabase/server";
import { reportMonthsSchema } from "@/lib/validations/relatorios";
import {
  buildMonthRange,
  aggregateMonthlyMetrics,
  rankTopProducts,
  parseMonthKey,
  type SaleRecord,
  type SaleItemRecord,
} from "@/lib/relatorios/monthly-report";
import ReportView from "@/components/relatorios/report-view";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const { months: monthsParam } = await searchParams;
  const monthsCount = reportMonthsSchema.parse(monthsParam);

  const monthKeys = buildMonthRange(monthsCount, new Date());
  const first = parseMonthKey(monthKeys[0]);
  const last = parseMonthKey(monthKeys[monthKeys.length - 1]);
  const startDate = new Date(first.year, first.monthIndex, 1).toISOString();
  const endDate = new Date(last.year, last.monthIndex + 1, 1).toISOString();

  const supabase = await createClient();
  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, sale_date, gross_revenue, net_profit, sale_items(product_id, quantity, subtotal)")
      .gte("sale_date", startDate)
      .lt("sale_date", endDate)
      .order("sale_date", { ascending: true }),
    supabase.from("products").select("id, name"),
  ]);

  const salesList = sales ?? [];
  const productNames = new Map((products ?? []).map((p) => [p.id, p.name]));

  const saleRecords: SaleRecord[] = salesList.map((s) => ({
    saleDate: s.sale_date,
    grossRevenue: Number(s.gross_revenue),
    netProfit: Number(s.net_profit),
  }));

  const saleItemRecords: SaleItemRecord[] = salesList.flatMap((s) =>
    s.sale_items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    }))
  );

  const monthlyMetrics = aggregateMonthlyMetrics(saleRecords, monthKeys);
  const topProducts = rankTopProducts(saleItemRecords, productNames);
  const periodLabel = `${monthlyMetrics[0].label} a ${monthlyMetrics[monthlyMetrics.length - 1].label}`;

  return (
    <ReportView
      periodLabel={periodLabel}
      monthsCount={monthsCount}
      months={monthlyMetrics}
      topProducts={topProducts}
    />
  );
}
```

- [ ] **Step 3: Add the sidebar link**

In `components/dashboard/sidebar.tsx`, add `FileBarChart` to the `lucide-react` import and insert a new entry in `links` between `"/dashboard/metas"` and `"/dashboard/configuracoes"`:

```typescript
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Target,
  FileBarChart,
  Settings,
  Menu,
  X,
  LogOut,
  CircleHelp,
} from "lucide-react";
```

```typescript
const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/estoque", label: "Estoque", icon: Boxes },
  { href: "/dashboard/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/dashboard/metas", label: "Metas", icon: Target },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Pay attention to the Supabase-inferred type of `s.sale_items` (array) and `item.product_id`/`item.quantity`/`item.subtotal` field names — they must match the `select(...)` string exactly.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in, open `/dashboard/relatorios`. Confirm: page loads without error, "Relatórios" appears in the sidebar and highights as active, changing the month-count select updates the URL (`?months=N`) and re-renders the comparison. If there's no sales data yet, confirm the empty states from Task 4 render instead of crashing.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/relatorios/page.tsx lib/validations/relatorios.ts components/dashboard/sidebar.tsx
git commit -m "feat(relatorios): adiciona página /dashboard/relatorios e link no menu"
```

---

### Task 6: Exportação em PDF

**Files:**
- Create: `lib/relatorios/download-file.ts`
- Create: `components/relatorios/report-pdf-document.tsx`
- Modify: `components/relatorios/report-view.tsx`
- Modify: `package.json`, `package-lock.json` (via `npm install`)

**Interfaces:**
- Consumes: `MonthlyMetric`, `TopProduct` (Task 1)
- Produces (used by Task 7): `function downloadBlob(blob: Blob, filename: string): void`

- [ ] **Step 1: Install the dependency**

Run: `npm install @react-pdf/renderer`
Expected: adds `@react-pdf/renderer` (`^4.6.1`) to `package.json` dependencies, no peer-dependency warnings (React 19 is supported per its `peerDependencies`).

- [ ] **Step 2: Add the shared download helper**

```typescript
// lib/relatorios/download-file.ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Build the PDF document template**

```tsx
// components/relatorios/report-pdf-document.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MonthlyMetric, TopProduct } from "@/lib/relatorios/monthly-report";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#6B7280", marginBottom: 16 },
  sectionTitle: { fontSize: 13, marginTop: 16, marginBottom: 8 },
  table: { display: "flex", flexDirection: "column", borderWidth: 1, borderColor: "#E5E7EB" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  headerRow: { flexDirection: "row", backgroundColor: "#F3F4F6" },
  cell: { flex: 1, padding: 6 },
  headerCell: { flex: 1, padding: 6, fontWeight: 700 },
});

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ReportPdfDocument({
  periodLabel,
  months,
  topProducts,
}: {
  periodLabel: string;
  months: MonthlyMetric[];
  topProducts: TopProduct[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Faturio — Relatório de {periodLabel}</Text>
        <Text style={styles.subtitle}>Comparação de faturamento, vendas e lucro por mês</Text>

        <Text style={styles.sectionTitle}>Comparativo mensal</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>Mês</Text>
            <Text style={styles.headerCell}>Faturamento</Text>
            <Text style={styles.headerCell}>Vendas</Text>
            <Text style={styles.headerCell}>Lucro</Text>
            <Text style={styles.headerCell}>Margem</Text>
          </View>
          {months.map((m) => (
            <View style={styles.row} key={m.month}>
              <Text style={styles.cell}>{m.label}</Text>
              <Text style={styles.cell}>{formatCurrency(m.revenue)}</Text>
              <Text style={styles.cell}>{m.salesCount}</Text>
              <Text style={styles.cell}>{formatCurrency(m.profit)}</Text>
              <Text style={styles.cell}>{(m.margin * 100).toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Produtos mais vendidos no período</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>Produto</Text>
            <Text style={styles.headerCell}>Quantidade</Text>
            <Text style={styles.headerCell}>Faturamento</Text>
          </View>
          {topProducts.map((p) => (
            <View style={styles.row} key={p.productId}>
              <Text style={styles.cell}>{p.name}</Text>
              <Text style={styles.cell}>{p.quantity}</Text>
              <Text style={styles.cell}>{formatCurrency(p.revenue)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: Wire the "Baixar PDF" button into `report-view.tsx`**

Add these imports to `components/relatorios/report-view.tsx`:

```typescript
import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/relatorios/download-file";
import { ReportPdfDocument } from "@/components/relatorios/report-pdf-document";
```

Inside `ReportView`, before the `return`, add:

```typescript
const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
const hasData = months.some((m) => m.salesCount > 0);

async function handleDownloadPdf() {
  setIsGeneratingPdf(true);
  try {
    const blob = await pdf(
      <ReportPdfDocument periodLabel={periodLabel} months={months} topProducts={topProducts} />
    ).toBlob();
    downloadBlob(blob, `relatorio-${periodLabel.replace(/\s+/g, "-")}.pdf`);
  } finally {
    setIsGeneratingPdf(false);
  }
}
```

In the header `<div className="flex flex-wrap items-end justify-between gap-4">`, add a button group next to the month selector:

```tsx
<div className="flex gap-2">
  <Button type="button" variant="secondary" size="sm" disabled={!hasData || isGeneratingPdf} onClick={handleDownloadPdf}>
    {isGeneratingPdf ? "Gerando..." : "Baixar PDF"}
  </Button>
</div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `/dashboard/relatorios` with at least one sale in the period, click "Baixar PDF". Confirm a PDF file downloads and opens showing the two tables with correct data. With zero sales in the period, confirm the button is disabled.

- [ ] **Step 7: Commit**

```bash
git add lib/relatorios/download-file.ts components/relatorios/report-pdf-document.tsx components/relatorios/report-view.tsx package.json package-lock.json
git commit -m "feat(relatorios): adiciona exportação em PDF"
```

---

### Task 7: Exportação em XML

**Files:**
- Modify: `components/relatorios/report-view.tsx`

**Interfaces:**
- Consumes: `buildReportXml` (Task 2), `downloadBlob` (Task 6)

- [ ] **Step 1: Wire the "Baixar XML" button into `report-view.tsx`**

Add this import:

```typescript
import { buildReportXml } from "@/lib/relatorios/export-xml";
```

Add the handler next to `handleDownloadPdf`:

```typescript
function handleDownloadXml() {
  const xml = buildReportXml(periodLabel, months, topProducts);
  downloadBlob(
    new Blob([xml], { type: "application/xml" }),
    `relatorio-${periodLabel.replace(/\s+/g, "-")}.xml`
  );
}
```

Add the button next to "Baixar PDF" in the same button group:

```tsx
<Button type="button" variant="secondary" size="sm" disabled={!hasData} onClick={handleDownloadXml}>
  Baixar XML
</Button>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/dashboard/relatorios`, click "Baixar XML". Confirm a `.xml` file downloads and its contents match the `<relatorio>` schema from the spec (open it in a text editor — one `<mes>` per month shown on the page, one `<produto>` per row in the top-5 table).

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run && npx tsc --noEmit && npx eslint .`
Expected: all green — this is the last task, so this is the final check that nothing in the feature broke the rest of the app.

- [ ] **Step 5: Commit**

```bash
git add components/relatorios/report-view.tsx
git commit -m "feat(relatorios): adiciona exportação em XML"
```

---

## Self-Review Notes

- **Spec coverage:** §2 Navegação → Task 5 Step 3. §3 Fluxo de dados → Task 1 + Task 5. §4 UI → Task 3 + Task 4. §5 Exportação (PDF) → Task 6, (XML) → Task 2 + Task 7. §6 Casos de borda (mês zerado, sem venda no período, RLS) → covered in Task 1's tests and Task 4/5's empty states; RLS needs no new code since the query goes through the same session-scoped client as every other page. §7 Testes → Task 1 and Task 2. §8 Fora de escopo → nothing in this plan implements Excel/CSV, non-contiguous periods, per-product filtering, or email scheduling, matching the spec.
- **Type consistency check:** `MonthlyMetric`/`TopProduct`/`SaleRecord`/`SaleItemRecord` field names are identical across Task 1 (definition), Task 2 (`buildReportXml`), Task 4 (`ReportView` props), Task 5 (page construction), and Task 6 (`ReportPdfDocument`) — verified by re-reading each usage against Task 1's interfaces block.
- **Verified ahead of time:** confirmed `--color-success`/`--color-destructive` are defined in `app/globals.css`'s `@theme` block, so `text-success`/`text-destructive` (used in `ChangeBadge`, Task 4) are valid generated Tailwind 4 utilities — no open risk here.
