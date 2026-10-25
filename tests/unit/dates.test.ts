import { describe, expect, it } from "vitest";
import {
  dayKeyOf,
  daysInMonth,
  formatDate,
  formatDateTime,
  monthKeyOf,
  startOfZonedDay,
  zonedMidnight,
  zonedMonthStart,
  zonedParts,
} from "@/lib/dates";
import { comparisonRange, cumulativeRevenue, monthRange, parseMonthParam } from "@/lib/dashboard/overview";
import { aggregateMonthlyMetrics, buildMonthRange } from "@/lib/relatorios/monthly-report";
import { totalsByMonth } from "@/lib/metas/goals-view";
import { groupByMonth, periodStart } from "@/lib/vendas/sales-view";

// 22h de 31/out em Brasília = 01h de 01/nov em UTC: o caso da issue #6.
const lateSale = "2026-11-01T01:00:00.000Z";

describe("lib/dates", () => {
  it("lê dia e mês no horário de Brasília, não em UTC", () => {
    expect(zonedParts(lateSale)).toEqual({ year: 2026, month: 10, day: 31 });
    expect(monthKeyOf(lateSale)).toBe("2026-10");
    expect(dayKeyOf(lateSale)).toBe("2026-10-31");
  });

  it("meia-noite de Brasília é 03h UTC", () => {
    expect(zonedMidnight(2026, 10, 31).toISOString()).toBe("2026-10-31T03:00:00.000Z");
    expect(startOfZonedDay(lateSale).toISOString()).toBe("2026-10-31T03:00:00.000Z");
  });

  it("normaliza mês e dia fora do intervalo", () => {
    expect(zonedMonthStart(2026, 13).toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(zonedMidnight(2026, 3, 0).toISOString()).toBe("2026-02-28T03:00:00.000Z");
    expect(zonedMidnight(2026, 10, -5).toISOString()).toBe("2026-09-25T03:00:00.000Z");
  });

  it("respeita o horário de verão antigo", () => {
    // Jan/2018 ainda tinha horário de verão (UTC−2).
    expect(zonedMidnight(2018, 1, 15).toISOString()).toBe("2018-01-15T02:00:00.000Z");
    expect(monthKeyOf("2018-01-31T22:30:00.000Z")).toBe("2018-01");
  });

  it("dias do mês", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 10)).toBe(31);
  });

  it("formata no horário de Brasília", () => {
    expect(formatDate(lateSale)).toBe("31/10/2026");
    expect(formatDate(lateSale, { day: "2-digit", month: "2-digit" })).toBe("31/10");
    expect(formatDateTime(lateSale)).toMatch(/^31\/10\/2026,? 22:00:00$/);
  });
});

describe("venda às 22h de 31/10 (horário de Brasília)", () => {
  const sale = { saleDate: lateSale, grossRevenue: 100, netProfit: 40, items: [] };

  it("Visão geral: entra no intervalo de outubro e no dia 31 do gráfico", () => {
    const range = monthRange({ year: 2026, month: 10 });
    expect(range.start.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(new Date(lateSale) >= range.start && new Date(lateSale) < range.end).toBe(true);

    const points = cumulativeRevenue([sale], { year: 2026, month: 10 }, new Date("2026-11-05T12:00:00Z"));
    expect(points[30]).toEqual({ day: 31, cumulative: 100, dayRevenue: 100 });
  });

  it("Visão geral: às 22h de 31/10 o mês atual ainda é outubro e vai até o dia 31", () => {
    const now = new Date(lateSale);
    expect(parseMonthParam(undefined, now)).toEqual({ year: 2026, month: 10 });
    const points = cumulativeRevenue([sale], { year: 2026, month: 10 }, now);
    expect(points[30].cumulative).toBe(100);
    // Setembro tem 30 dias: no dia 31 a comparação usa setembro inteiro.
    expect(comparisonRange({ year: 2026, month: 10 }, now).partial).toBe(false);
  });

  it("Relatórios: conta em outubro", () => {
    const now = new Date(lateSale);
    const keys = buildMonthRange(2, now);
    expect(keys).toEqual(["2026-09", "2026-10"]);
    const [, october] = aggregateMonthlyMetrics([sale], keys, now);
    expect(october).toMatchObject({ month: "2026-10", revenue: 100, salesCount: 1, partial: true });
  });

  it("Metas: soma no realizado de outubro", () => {
    expect(totalsByMonth([sale]).get("2026-10")).toEqual({ revenue: 100, profit: 40 });
    expect(totalsByMonth([sale]).has("2026-11")).toBe(false);
  });

  it("Vendas: agrupa em outubro e entra no filtro de hoje", () => {
    expect(groupByMonth([{ saleDate: lateSale }])[0].label).toBe("outubro 2026");
    expect(periodStart("7", new Date(lateSale))?.toISOString()).toBe("2026-10-25T03:00:00.000Z");
  });
});
