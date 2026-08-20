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
