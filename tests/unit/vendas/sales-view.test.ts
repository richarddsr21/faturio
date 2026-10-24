import { describe, expect, it } from "vitest";
import {
  groupByMonth,
  parseSalesPeriod,
  periodStart,
  saleMargin,
  summarizeSales,
} from "@/lib/vendas/sales-view";

describe("parseSalesPeriod", () => {
  it("aceita 7/30/90/tudo e cai em tudo no resto", () => {
    expect(parseSalesPeriod("30")).toBe("30");
    expect(parseSalesPeriod("tudo")).toBe("tudo");
    expect(parseSalesPeriod("15")).toBe("tudo");
    expect(parseSalesPeriod(undefined)).toBe("tudo");
  });
});

describe("periodStart", () => {
  const now = new Date(2026, 9, 24, 15, 30);

  it("7 dias conta hoje e os 6 anteriores, desde a meia-noite", () => {
    expect(periodStart("7", now)).toEqual(new Date(2026, 9, 18));
  });

  it("atravessa o mês", () => {
    expect(periodStart("30", now)).toEqual(new Date(2026, 8, 25));
  });

  it("tudo não tem início", () => {
    expect(periodStart("tudo", now)).toBeNull();
  });
});

describe("summarizeSales", () => {
  it("soma e ordena as formas de pagamento pela mais usada", () => {
    const summary = summarizeSales([
      { grossRevenue: 1317.8, netProfit: 693, paymentMethod: "pix" },
      { grossRevenue: 59.9, netProfit: 31.5, paymentMethod: "dinheiro" },
      { grossRevenue: 119.9, netProfit: 36.91, paymentMethod: "pix" },
    ]);
    expect(summary.revenue).toBeCloseTo(1497.6);
    expect(summary.profit).toBeCloseTo(761.41);
    expect(summary.count).toBe(3);
    expect(summary.payments.map((p) => [p.method, p.count])).toEqual([
      ["pix", 2],
      ["dinheiro", 1],
    ]);
    expect(summary.payments[0].share).toBeCloseTo(2 / 3);
  });

  it("sem vendas", () => {
    expect(summarizeSales([])).toEqual({ revenue: 0, profit: 0, count: 0, payments: [] });
  });
});

describe("saleMargin", () => {
  it("lucro sobre faturamento", () => {
    expect(saleMargin(1317.8, 693)).toBeCloseTo(0.526, 3);
    expect(saleMargin(0, 0)).toBeNull();
  });
});

describe("groupByMonth", () => {
  it("agrupa vendas consecutivas do mesmo mês, na ordem recebida", () => {
    const groups = groupByMonth([
      { id: "a", saleDate: new Date(2026, 8, 28, 12).toISOString() },
      { id: "b", saleDate: new Date(2026, 8, 27, 12).toISOString() },
      { id: "c", saleDate: new Date(2026, 7, 10, 12).toISOString() },
    ]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["setembro 2026", ["a", "b"]],
      ["agosto 2026", ["c"]],
    ]);
  });
});
