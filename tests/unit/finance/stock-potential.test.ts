import { describe, it, expect } from "vitest";
import { calculateStockPotential, meetsGoalWithStock } from "@/lib/finance/stock-potential";

describe("calculateStockPotential", () => {
  it("soma quantidade em estoque vezes preço de venda de cada produto", () => {
    const potential = calculateStockPotential([
      { stockQuantity: 100, currentPrice: 400 },
      { stockQuantity: 50, currentPrice: 500 },
    ]);
    expect(potential).toBe(65000);
  });

  it("meetsGoalWithStock indica se o potencial cobre a meta", () => {
    expect(meetsGoalWithStock(65000, 50000)).toBe(true);
    expect(meetsGoalWithStock(30000, 50000)).toBe(false);
  });
});
