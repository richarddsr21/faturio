"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "@/components/relatorios/comparison-chart";
import { ReportPdfDocument } from "@/components/relatorios/report-pdf-document";
import { downloadBlob } from "@/lib/relatorios/download-file";
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
        <div className="flex flex-wrap items-end gap-3">
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!hasData || isGeneratingPdf}
              onClick={handleDownloadPdf}
            >
              {isGeneratingPdf ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
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
