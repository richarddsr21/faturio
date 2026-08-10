import { describe, it, expect } from "vitest";
import { calculateGoalProgress } from "@/lib/finance/goals";

describe("calculateGoalProgress", () => {
  it("calcula quanto falta e quantas vendas estimadas faltam", () => {
    const result = calculateGoalProgress({
      goal: 50000,
      currentRevenue: 32450,
      averageTicket: 125,
    });
    expect(result.remaining).toBeCloseTo(17550, 2);
    expect(result.estimatedSalesNeeded).toBe(141);
    expect(result.progressPercentage).toBeCloseTo(0.649, 3);
  });

  it("não retorna valor negativo quando a meta já foi batida", () => {
    const result = calculateGoalProgress({
      goal: 10000,
      currentRevenue: 15000,
      averageTicket: 100,
    });
    expect(result.remaining).toBe(0);
    expect(result.estimatedSalesNeeded).toBe(0);
    expect(result.progressPercentage).toBe(1);
  });
});
