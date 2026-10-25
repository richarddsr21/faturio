import { describe, expect, it } from "vitest";
import { goalHistory, previousMonthResult, totalsByMonth } from "@/lib/metas/goals-view";

const now = new Date("2026-10-24T12:00:00-03:00"); // 24/out/2026, horário de Brasília
const sale = (month: number, day: number, revenue: number, profit: number) => ({
  saleDate: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00-03:00`,
  grossRevenue: revenue,
  netProfit: profit,
});

const sales = [sale(9, 28, 1317.8, 693), sale(9, 27, 59.9, 31.5), sale(8, 10, 119.9, 36.91)];

describe("totalsByMonth", () => {
  it("soma faturamento e lucro por mês", () => {
    const totals = totalsByMonth(sales);
    expect(totals.get("2026-09")?.revenue).toBeCloseTo(1377.7);
    expect(totals.get("2026-08")?.profit).toBeCloseTo(36.91);
  });
});

describe("goalHistory", () => {
  const history = goalHistory(
    [
      { month: 8, year: 2026, revenueGoal: 1000, desiredMargin: 0.37 },
      { month: 9, year: 2026, revenueGoal: 1000, desiredMargin: null },
      { month: 10, year: 2026, revenueGoal: 1500, desiredMargin: 0.4 },
      { month: 11, year: 2026, revenueGoal: 2000, desiredMargin: null },
    ],
    sales,
    now
  );

  it("ordena do mais recente para o mais antigo", () => {
    expect(history.map((h) => h.key)).toEqual(["2026-11", "2026-10", "2026-09", "2026-08"]);
  });

  it("bate os números da referência", () => {
    const sep = history.find((h) => h.key === "2026-09")!;
    expect(sep.state).toBe("hit");
    expect(sep.percent).toBeCloseTo(1.3777);
    expect(sep.realMargin).toBeCloseTo(0.526, 3);

    const aug = history.find((h) => h.key === "2026-08")!;
    expect(aug.state).toBe("missed");
    expect(aug.percent).toBeCloseTo(0.1199);
    expect(aug.realMargin).toBeCloseTo(0.308, 3);
  });

  it("mês atual sem bater a meta fica em andamento, não como não batida", () => {
    expect(history.find((h) => h.key === "2026-10")!.state).toBe("in_progress");
  });

  it("mês futuro fica planejado", () => {
    expect(history.find((h) => h.key === "2026-11")!.state).toBe("planned");
  });

  it("sem vendas, margem real é null", () => {
    expect(history.find((h) => h.key === "2026-10")!.realMargin).toBeNull();
  });

  it("previousMonthResult acha setembro", () => {
    expect(previousMonthResult(history, now)?.key).toBe("2026-09");
  });
});
