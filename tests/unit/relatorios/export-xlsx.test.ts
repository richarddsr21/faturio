import { describe, it, expect } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import { buildReportSheets, reportFileName, toXlsxSheets } from "@/lib/relatorios/export-xlsx";
import type { MonthlyMetric, TopProduct } from "@/lib/relatorios/monthly-report";

const months: MonthlyMetric[] = [
  {
    month: "2026-07",
    label: "jul/2026",
    revenue: 10000,
    salesCount: 40,
    profit: 2500,
    margin: 0.25,
    revenueChangePercent: null,
    profitChangePercent: null,
  },
  {
    month: "2026-08",
    label: "ago/2026",
    revenue: 12345.67,
    salesCount: 42,
    profit: 3456.78,
    margin: 0.28,
    revenueChangePercent: 0.2346,
    profitChangePercent: 0.3827,
  },
];

const products: TopProduct[] = [
  { productId: "p1", name: 'Camiseta "Premium" & Cia', quantity: 120, revenue: 4800 },
];

describe("reportFileName", () => {
  it("gera um nome sem barras, espaços nem acentos", () => {
    expect(reportFileName("jun/2026 a ago/2026", "xlsx")).toBe("relatorio-jun-2026-a-ago-2026.xlsx");
    expect(reportFileName("março/2026", "pdf")).toBe("relatorio-marco-2026.pdf");
  });
});

describe("buildReportSheets", () => {
  it("monta a aba de meses com cabeçalho, uma linha por mês e o total", () => {
    const [summary] = buildReportSheets(months, products);
    expect(summary.name).toBe("Resumo por mês");
    expect(summary.rows.slice(0, 3).map((row) => row.map((c) => c.value))).toEqual([
      ["Mês", "Faturamento", "Vendas", "Lucro", "Margem", "Var. faturamento", "Var. lucro"],
      ["jul/2026", 10000, 40, 2500, 0.25, null, null],
      ["ago/2026", 12345.67, 42, 3456.78, 0.28, 0.2346, 0.3827],
    ]);
    // Total arredondado ao centavo (sem erro de ponto flutuante na soma).
    expect(summary.rows[3].map((c) => c.value)).toEqual(["Total", 22345.67, 82, 5956.78, 5956.78 / 22345.67, null, null]);
  });

  it("monta a aba de mais vendidos", () => {
    const [, top] = buildReportSheets(months, products);
    expect(top.rows.map((row) => row.map((c) => c.value))).toEqual([
      ["Produto", "Quantidade", "Faturamento"],
      ['Camiseta "Premium" & Cia', 120, 4800],
    ]);
  });

  it("sem dados, as abas têm só o cabeçalho", () => {
    const sheets = buildReportSheets([], []);
    expect(sheets.map((s) => s.rows.length)).toEqual([1, 1]);
  });
});

describe("arquivo .xlsx gerado", () => {
  it("é uma planilha válida que abre com os valores como números", async () => {
    const buffer = await writeXlsxFile(toXlsxSheets(buildReportSheets(months, products))).toBuffer();

    const summary = await readSheet(buffer, "Resumo por mês");
    expect(summary[0]).toEqual(["Mês", "Faturamento", "Vendas", "Lucro", "Margem", "Var. faturamento", "Var. lucro"]);
    expect(summary[2]).toEqual(["ago/2026", 12345.67, 42, 3456.78, 0.28, 0.2346, 0.3827]);
    expect(summary[1]).toEqual(["jul/2026", 10000, 40, 2500, 0.25, null, null]);
    expect(summary[3].slice(0, 4)).toEqual(["Total", 22345.67, 82, 5956.78]);

    const top = await readSheet(buffer, "Mais vendidos");
    expect(top[1]).toEqual(['Camiseta "Premium" & Cia', 120, 4800]);
  });
});
