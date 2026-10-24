"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ComparisonChart } from "@/components/relatorios/comparison-chart";
import { ReportPdfDocument } from "@/components/relatorios/report-pdf-document";
import { buildReportSheets, reportFileName, toXlsxSheets } from "@/lib/relatorios/export-xlsx";
import { downloadBlob } from "@/lib/relatorios/download-file";
import { parseMonthKey, type MonthlyMetric, type TopProduct } from "@/lib/relatorios/monthly-report";
import { cn } from "@/lib/utils";

export interface ReportViewProps {
  periodLabel: string;
  monthsCount: number;
  months: MonthlyMetric[];
  topProducts: TopProduct[];
}

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const periodOptions = [3, 6, 12];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function monthName(key: string) {
  return monthNames[parseMonthKey(key).monthIndex];
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "AGO A OUT 2026" ou "NOV 2025 A JAN 2026". */
function headerPeriod(months: MonthlyMetric[]) {
  const first = parseMonthKey(months[0].month);
  const last = parseMonthKey(months[months.length - 1].month);
  const abbr = (i: number) => monthNames[i].slice(0, 3);
  return first.year === last.year
    ? `${abbr(first.monthIndex)} a ${abbr(last.monthIndex)} ${last.year}`
    : `${abbr(first.monthIndex)} ${first.year} a ${abbr(last.monthIndex)} ${last.year}`;
}

function Change({ value, className }: { value: number | null; className?: string }) {
  // Zero (ex.: 0 contra 0 no começo do mês) não diz nada; só ocupa espaço.
  if (value === null || value === 0) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold",
        up ? "text-primary" : "text-warning",
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : ""}
      {formatPercent(value)}
    </span>
  );
}

export default function ReportView({ periodLabel, monthsCount, months, topProducts }: ReportViewProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);
  const hasData = months.some((m) => m.salesCount > 0);

  async function handleDownloadPdf() {
    setIsGeneratingPdf(true);
    try {
      const blob = await pdf(
        <ReportPdfDocument periodLabel={periodLabel} months={months} topProducts={topProducts} />
      ).toBlob();
      downloadBlob(blob, reportFileName(periodLabel, "pdf"));
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function handleDownloadXlsx() {
    setIsGeneratingXlsx(true);
    try {
      // Carregada só no clique, para não pesar a página de relatórios.
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const sheets = toXlsxSheets(buildReportSheets(months, topProducts));
      const blob = await writeXlsxFile(sheets).toBlob();
      downloadBlob(blob, reportFileName(periodLabel, "xlsx"));
    } finally {
      setIsGeneratingXlsx(false);
    }
  }

  const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
  const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : null;
  const lastMonth = months[months.length - 1];
  const previousMonth = months.length > 1 ? months[months.length - 2] : null;
  const bestMonth = hasData ? months.reduce((best, m) => (m.revenue > best.revenue ? m : best), months[0]) : null;
  const topQuantity = topProducts[0]?.quantity ?? 0;

  const metricRows: { label: string; cells: { value: string; change: number | null }[] }[] = [
    { label: "Faturamento", cells: months.map((m) => ({ value: formatCurrency(m.revenue), change: m.revenueChangePercent })) },
    { label: "Nº de vendas", cells: months.map((m) => ({ value: String(m.salesCount), change: null })) },
    { label: "Lucro", cells: months.map((m) => ({ value: formatCurrency(m.profit), change: m.profitChangePercent })) },
    { label: "Margem", cells: months.map((m) => ({ value: m.revenue > 0 ? formatPercent(m.margin) : "—", change: null })) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            Relatórios · {headerPeriod(months)}
          </p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">Como seu negócio evoluiu</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedNav
            label="Período do relatório"
            items={periodOptions.map((n) => ({
              label: `${n} meses`,
              href: `/dashboard/relatorios?months=${n}`,
              active: n === monthsCount,
            }))}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!hasData || isGeneratingPdf}
            onClick={handleDownloadPdf}
          >
            <Download className="h-4 w-4" />
            {isGeneratingPdf ? "Gerando..." : "PDF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hasData || isGeneratingXlsx}
            onClick={handleDownloadXlsx}
          >
            <Download className="h-4 w-4" />
            {isGeneratingXlsx ? "Gerando..." : "Excel"}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo do período">
        <div className="flex min-w-0 flex-col gap-3 rounded-card bg-primary p-4 text-primary-foreground shadow-[var(--shadow-button-primary)] sm:p-5">
          <p className="text-[13px] font-medium leading-tight">Faturamento no período</p>
          <p className="truncate font-display text-xl font-bold tracking-tight tabular-nums sm:text-3xl">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4 sm:p-5">
          <p className="text-[13px] leading-tight text-muted-foreground">Melhor mês</p>
          <p className="truncate font-display text-xl font-bold capitalize tracking-tight sm:text-3xl">
            {bestMonth ? monthName(bestMonth.month) : "—"}
          </p>
          {bestMonth && <p className="truncate text-xs text-muted-foreground">{formatCurrency(bestMonth.revenue)}</p>}
        </div>
        <div className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4 sm:p-5">
          <p className="text-[13px] leading-tight text-muted-foreground">Margem média</p>
          <p className="truncate font-display text-xl font-bold tracking-tight tabular-nums sm:text-3xl">
            {avgMargin !== null ? formatPercent(avgMargin) : "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">Lucro ÷ faturamento do período</p>
        </div>
        <CurrentMonthCard month={lastMonth} previous={previousMonth} />
      </section>

      <div className="rounded-card border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Faturamento e lucro por mês</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" aria-hidden />
              Faturamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-lilac" aria-hidden />
              Lucro
            </span>
          </div>
        </div>
        <div className="mt-4">
          {hasData ? (
            <ComparisonChart
              data={months.map((m) => ({ label: m.label, revenue: m.revenue, profit: m.profit, partial: m.partial }))}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma venda registrada neste período.</p>
          )}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 rounded-card border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Comparativo mensal</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                    Métrica
                  </th>
                  {months.map((m) => (
                    <th key={m.month} scope="col" className="px-3 py-2.5 text-left font-medium">
                      {monthName(m.month).slice(0, 3)}
                      {m.partial && <span className="ml-1 normal-case tracking-normal text-lilac">até agora</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metricRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="py-3 pr-3 text-left text-[13px] font-medium text-muted-foreground">
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td key={months[i].month} className="px-3 py-3 align-top">
                        <span className="block font-mono text-[13px] font-semibold whitespace-nowrap">{cell.value}</span>
                        <Change value={cell.change} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lastMonth?.partial && (
            <p className="mt-3 text-xs text-muted-foreground">
              {capitalize(monthName(lastMonth.month))} ainda está em andamento: a variação compara com os mesmos dias de{" "}
              {previousMonth ? monthName(previousMonth.month) : "o mês anterior"}.
            </p>
          )}
        </div>

        <div className="min-w-0 rounded-card border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold">Mais vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum produto vendido neste período.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-4">
              {topProducts.map((product, index) => (
                <li key={product.productId} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] font-mono text-xs font-bold",
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={product.name}>
                      {product.name}
                    </p>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{product.quantity} un.</span>
                  </div>
                  <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn("h-full rounded-full", index === 0 ? "bg-primary" : "bg-lilac")}
                      style={{ width: `${topQuantity > 0 ? (product.quantity / topQuantity) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="ml-10 font-mono text-xs font-semibold">{formatCurrency(product.revenue)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function CurrentMonthCard({ month, previous }: { month: MonthlyMetric; previous: MonthlyMetric | null }) {
  const name = capitalize(monthName(month.month));
  const empty = month.salesCount === 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border p-4 sm:p-5",
        empty ? "border-warning/30 bg-warning/10" : "border-border bg-card"
      )}
    >
      <p className={cn("text-[13px] leading-tight", empty ? "text-warning" : "text-muted-foreground")}>
        {name} {month.partial ? "até agora" : ""}
      </p>
      <p
        className={cn(
          "truncate font-display text-xl font-bold tracking-tight tabular-nums sm:text-3xl",
          empty && "text-warning"
        )}
      >
        {formatCurrency(month.revenue)}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {empty ? (
          "sem vendas ainda"
        ) : month.revenueChangePercent !== null && previous ? (
          <>
            <Change value={month.revenueChangePercent} /> vs {month.partial ? "mesmos dias de " : ""}
            {monthName(previous.month)}
          </>
        ) : (
          `${month.salesCount} ${month.salesCount === 1 ? "venda" : "vendas"}`
        )}
      </p>
    </div>
  );
}
