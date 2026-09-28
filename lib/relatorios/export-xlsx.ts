// Conteúdo da planilha de exportação do relatório (.xlsx). Puro — quem grava o arquivo é o
// componente, com write-excel-file. Valores ficam como número (não texto) para a pessoa
// poder somar e fazer gráficos no Excel; a formatação de moeda/percentual é só de exibição.

import type { MonthlyMetric, TopProduct } from "./monthly-report";

export type ReportCellFormat = "currency" | "percent" | "integer";

export interface ReportCell {
  value: string | number | null;
  format?: ReportCellFormat;
  bold?: boolean;
}

export interface ReportSheet {
  name: string;
  columnWidths: number[];
  rows: ReportCell[][];
}

const header = (labels: string[]): ReportCell[] => labels.map((value) => ({ value, bold: true }));

const roundCents = (value: number) => Math.round(value * 100) / 100;

/** Nome de arquivo seguro a partir do período ("jun/2026 a ago/2026" → "jun-2026-a-ago-2026"). */
export function reportFileName(periodLabel: string, extension: string): string {
  const slug = periodLabel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `relatorio-${slug || "faturio"}.${extension}`;
}

export function buildReportSheets(months: MonthlyMetric[], topProducts: TopProduct[]): ReportSheet[] {
  const totalRevenue = roundCents(months.reduce((sum, m) => sum + m.revenue, 0));
  const totalProfit = roundCents(months.reduce((sum, m) => sum + m.profit, 0));
  const totalSales = months.reduce((sum, m) => sum + m.salesCount, 0);

  const monthRows: ReportCell[][] = months.map((m) => [
    { value: m.label },
    { value: m.revenue, format: "currency" },
    { value: m.salesCount, format: "integer" },
    { value: m.profit, format: "currency" },
    { value: m.margin, format: "percent" },
    { value: m.revenueChangePercent, format: "percent" },
    { value: m.profitChangePercent, format: "percent" },
  ]);

  const totalRow: ReportCell[] = [
    { value: "Total", bold: true },
    { value: totalRevenue, format: "currency", bold: true },
    { value: totalSales, format: "integer", bold: true },
    { value: totalProfit, format: "currency", bold: true },
    { value: totalRevenue > 0 ? totalProfit / totalRevenue : 0, format: "percent", bold: true },
    { value: null },
    { value: null },
  ];

  return [
    {
      name: "Resumo por mês",
      columnWidths: [14, 16, 10, 16, 10, 20, 16],
      rows: [
        header(["Mês", "Faturamento", "Vendas", "Lucro", "Margem", "Var. faturamento", "Var. lucro"]),
        ...monthRows,
        ...(months.length > 0 ? [totalRow] : []),
      ],
    },
    {
      name: "Mais vendidos",
      columnWidths: [40, 12, 16],
      rows: [
        header(["Produto", "Quantidade", "Faturamento"]),
        ...topProducts.map((p): ReportCell[] => [
          { value: p.name },
          { value: p.quantity, format: "integer" },
          { value: p.revenue, format: "currency" },
        ]),
      ],
    },
  ];
}

// Formatos de exibição do Excel; os separadores (1.234,56) seguem o idioma do Excel de quem abre.
const XLSX_FORMATS: Record<ReportCellFormat, string> = {
  currency: '"R$" #,##0.00',
  percent: "0.0%",
  integer: "0",
};

/** Abas no formato do write-excel-file, com cabeçalho fixo ao rolar. */
export function toXlsxSheets(sheets: ReportSheet[]) {
  return sheets.map((sheet) => ({
    sheet: sheet.name,
    columns: sheet.columnWidths.map((width) => ({ width })),
    stickyRowsCount: 1,
    data: sheet.rows.map((row) =>
      // Célula vazia (ex.: variação do primeiro mês) não pode ter formato — o
      // write-excel-file recusa, e o download inteiro falharia.
      row.map((cell) =>
        cell.value === null
          ? null
          : {
              value: cell.value,
              format: cell.format ? XLSX_FORMATS[cell.format] : undefined,
              fontWeight: cell.bold ? ("bold" as const) : undefined,
            }
      )
    ),
  }));
}
