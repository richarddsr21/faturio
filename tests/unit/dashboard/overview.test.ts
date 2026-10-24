import { describe, expect, it } from "vitest";
import {
  comparisonRange,
  cumulativeRevenue,
  goalStatus,
  mostCriticalStock,
  overviewHeadline,
  parseMonthParam,
  percentChange,
  shiftMonth,
  summarizeSales,
  topProduct,
  type OverviewSale,
} from "@/lib/dashboard/overview";

const now = new Date(2026, 9, 19, 15, 0); // 19/out/2026

function sale(day: number, revenue: number, profit: number, items: OverviewSale["items"] = []): OverviewSale {
  return { saleDate: new Date(2026, 8, day, 12).toISOString(), grossRevenue: revenue, netProfit: profit, items };
}

describe("parseMonthParam", () => {
  it("lê AAAA-MM", () => {
    expect(parseMonthParam("2026-09", now)).toEqual({ year: 2026, month: 9 });
  });

  it("volta para o mês atual se inválido ou no futuro", () => {
    expect(parseMonthParam(undefined, now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonthParam("2026-13", now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonthParam("abc", now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonthParam("2026-11", now)).toEqual({ year: 2026, month: 10 });
  });
});

describe("shiftMonth", () => {
  it("atravessa a virada do ano", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2025, month: 12 }, 1)).toEqual({ year: 2026, month: 1 });
  });
});

describe("comparisonRange", () => {
  it("no mês atual, corta o mês anterior no mesmo dia", () => {
    const range = comparisonRange({ year: 2026, month: 10 }, now);
    expect(range.partial).toBe(true);
    expect(range.start).toEqual(new Date(2026, 8, 1));
    expect(range.end).toEqual(new Date(2026, 8, 20));
  });

  it("em mês fechado, usa o mês anterior inteiro", () => {
    const range = comparisonRange({ year: 2026, month: 9 }, now);
    expect(range.partial).toBe(false);
    expect(range.end).toEqual(new Date(2026, 8, 1));
  });

  it("dia 31 com mês anterior de 30 dias usa o mês anterior inteiro", () => {
    const range = comparisonRange({ year: 2026, month: 10 }, new Date(2026, 9, 31));
    expect(range.partial).toBe(false);
    expect(range.end).toEqual(new Date(2026, 9, 1));
  });
});

describe("summarizeSales", () => {
  it("soma faturamento, lucro, peças e calcula margem e ticket", () => {
    const totals = summarizeSales([
      sale(1, 100, 40, [{ productId: "a", productName: "A", quantity: 2, subtotal: 100 }]),
      sale(2, 300, 60, [{ productId: "b", productName: "B", quantity: 1, subtotal: 300 }]),
    ]);
    expect(totals).toEqual({ revenue: 400, profit: 100, salesCount: 2, pieces: 3, margin: 0.25, averageTicket: 200 });
  });

  it("sem vendas, margem e ticket ficam 0", () => {
    expect(summarizeSales([])).toMatchObject({ margin: 0, averageTicket: 0 });
  });
});

describe("percentChange", () => {
  it("calcula a variação e devolve null sem base", () => {
    expect(percentChange(150, 100)).toBeCloseTo(0.5);
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("goalStatus", () => {
  it("sem meta", () => {
    expect(goalStatus(null, 500)).toEqual({ kind: "none" });
    expect(goalStatus(0, 500)).toEqual({ kind: "none" });
  });

  it("meta batida: excedente e fração da barra que é a meta", () => {
    const status = goalStatus(1000, 1377.7);
    expect(status.kind).toBe("hit");
    if (status.kind !== "hit") return;
    expect(status.percent).toBeCloseTo(1.3777);
    expect(status.excess).toBeCloseTo(377.7);
    expect(status.goalShare).toBeCloseTo(1000 / 1377.7);
  });

  it("meta em andamento: quanto falta", () => {
    expect(goalStatus(1000, 250)).toEqual({ kind: "progress", goal: 1000, percent: 0.25, remaining: 750 });
  });
});

describe("cumulativeRevenue", () => {
  it("acumula por dia e cobre o mês inteiro em mês fechado", () => {
    const points = cumulativeRevenue([sale(1, 100, 0), sale(3, 50, 0), sale(3, 25, 0)], { year: 2026, month: 9 }, now);
    expect(points).toHaveLength(30);
    expect(points[0]).toEqual({ day: 1, cumulative: 100, dayRevenue: 100 });
    expect(points[2]).toEqual({ day: 3, cumulative: 175, dayRevenue: 75 });
    expect(points[29].cumulative).toBe(175);
  });

  it("no mês atual, dias futuros ficam sem valor", () => {
    const points = cumulativeRevenue([], { year: 2026, month: 10 }, now);
    expect(points[18].cumulative).toBe(0);
    expect(points[19].cumulative).toBeNull();
  });
});

describe("topProduct", () => {
  it("escolhe quem mais faturou e calcula a participação", () => {
    const top = topProduct([
      sale(1, 0, 0, [
        { productId: "a", productName: "Camiseta", quantity: 3, subtotal: 150 },
        { productId: "b", productName: "Colar", quantity: 1, subtotal: 50 },
      ]),
      sale(2, 0, 0, [{ productId: "a", productName: "Camiseta", quantity: 1, subtotal: 50 }]),
    ]);
    expect(top).toEqual({ name: "Camiseta", quantity: 4, revenue: 200, share: 0.8 });
  });

  it("sem vendas, não há campeão", () => {
    expect(topProduct([])).toBeNull();
  });
});

describe("mostCriticalStock", () => {
  it("escolhe o produto proporcionalmente mais perto de acabar", () => {
    const critical = mostCriticalStock([
      { id: "1", name: "Ok", stockQuantity: 10, minimumStock: 3 },
      { id: "2", name: "No mínimo", stockQuantity: 5, minimumStock: 5 },
      { id: "3", name: "Quase zerado", stockQuantity: 1, minimumStock: 4 },
    ]);
    expect(critical?.name).toBe("Quase zerado");
  });

  it("sem produto com estoque baixo, devolve null", () => {
    expect(mostCriticalStock([{ id: "1", name: "Ok", stockQuantity: 10, minimumStock: 3 }])).toBeNull();
  });
});

describe("overviewHeadline", () => {
  const base = { salesCount: 2, isCurrentMonth: true, projection: 0 };

  it("comemora a meta batida", () => {
    expect(overviewHeadline({ ...base, goal: goalStatus(100, 150) })).toMatch(/próxima meta/);
  });

  it("indica se o ritmo bate a meta no mês atual", () => {
    expect(overviewHeadline({ ...base, goal: goalStatus(1000, 500), projection: 1200 })).toMatch(/ritmo certo/);
    expect(overviewHeadline({ ...base, goal: goalStatus(1000, 500), projection: 800 })).toMatch(/Ainda dá tempo/);
  });

  it("convida a definir meta quando não há", () => {
    expect(overviewHeadline({ ...base, goal: goalStatus(null, 500) })).toMatch(/Defina uma meta/);
  });
});
