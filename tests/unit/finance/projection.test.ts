import { describe, it, expect } from "vitest";
import { calculateAverageTicket, calculateMonthProjection } from "@/lib/finance/projection";

describe("calculateAverageTicket", () => {
  it("divide o faturamento pelo número de vendas", () => {
    expect(calculateAverageTicket(1000, 8)).toBe(125);
  });

  it("retorna 0 quando não há vendas", () => {
    expect(calculateAverageTicket(0, 0)).toBe(0);
  });
});

describe("calculateMonthProjection", () => {
  it("projeta o faturamento do mês por regra de três simples", () => {
    expect(calculateMonthProjection(15000, 10, 30)).toBe(45000);
  });

  it("retorna 0 quando o dia do mês é 0", () => {
    expect(calculateMonthProjection(1000, 0, 30)).toBe(0);
  });
});
