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
