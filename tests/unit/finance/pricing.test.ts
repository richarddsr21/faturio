import { describe, it, expect } from "vitest";
import { calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";

describe("calculateRecommendedPrice", () => {
  it("calcula o preço recomendado a partir de custo, taxas e margem", () => {
    const price = calculateRecommendedPrice({
      fixedCostsPerUnit: 30,
      feesPercentage: 0.1,
      desiredMargin: 0.2,
    });
    expect(price).toBeCloseTo(30 / 0.7, 2);
  });

  it("lança PricingError quando taxas + margem >= 100%", () => {
    expect(() =>
      calculateRecommendedPrice({
        fixedCostsPerUnit: 30,
        feesPercentage: 0.5,
        desiredMargin: 0.6,
      })
    ).toThrow(PricingError);
  });

  it("lança PricingError quando taxas + margem == 100% exatamente", () => {
    expect(() =>
      calculateRecommendedPrice({
        fixedCostsPerUnit: 30,
        feesPercentage: 0.5,
        desiredMargin: 0.5,
      })
    ).toThrow(PricingError);
  });
});
