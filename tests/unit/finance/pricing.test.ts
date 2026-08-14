import { describe, it, expect } from "vitest";
import { calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";

describe("calculateRecommendedPrice", () => {
  it("calcula o preço recomendado a partir de custo, taxas e margem", () => {
    const price = calculateRecommendedPrice({
      fixedCostsPerUnit: 30,
      feesPercentage: 0.1,
      desiredMargin: 0.2,
    });
    expect(price).toBeCloseTo((30 * 1.2) / 0.9, 2);
  });

  it("aplica a margem como markup sobre o custo, não sobre o preço final", () => {
    // custo total 24, taxas 14%, margem 85% -> preço deve ficar perto de R$ 51,63,
    // não R$ 2.400 (o que acontecia quando a margem era tratada como % do preço)
    const price = calculateRecommendedPrice({
      fixedCostsPerUnit: 24,
      feesPercentage: 0.14,
      desiredMargin: 0.85,
    });
    expect(price).toBeCloseTo((24 * 1.85) / 0.86, 2);
    expect(price).toBeLessThan(60);
  });

  it("lança PricingError quando as taxas somadas atingem 100%", () => {
    expect(() =>
      calculateRecommendedPrice({
        fixedCostsPerUnit: 30,
        feesPercentage: 1,
        desiredMargin: 0.2,
      })
    ).toThrow(PricingError);
  });

  it("lança PricingError quando as taxas somadas == 100% exatamente", () => {
    expect(() =>
      calculateRecommendedPrice({
        fixedCostsPerUnit: 30,
        feesPercentage: 1,
        desiredMargin: 0,
      })
    ).toThrow(PricingError);
  });
});
