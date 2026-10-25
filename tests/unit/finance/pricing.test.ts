import { describe, it, expect } from "vitest";
import { calculateChannelPrice, calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";

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

describe("calculateChannelPrice", () => {
  // Produto de R$ 37 + R$ 7 de frete de entrada, no TikTok Shop (10% + R$ 2 por peça).
  const tiktok = { commission: 0.1, fixedFee: 2 };
  const base = { unitCosts: 44, adminFee: 0, channel: tiktok, desiredMargin: 0.37 };

  it("soma a taxa fixa aos custos e a comissão à taxa administrativa", () => {
    const result = calculateChannelPrice({ ...base, currentPrice: 119.9 });
    // (44 + 2) × 1,37 ÷ (1 − 0,10)
    expect(result.suggestedPrice).toBeCloseTo((46 * 1.37) / 0.9, 2);
    // 119,90 − 46 − 11,99: o mesmo lucro por peça que o register_sale grava
    expect(result.profit).toBeCloseTo(61.91, 2);
    expect(result.margin).toBeCloseTo(61.91 / 119.9, 4);
    expect(result.belowDesired).toBe(false);
  });

  it("preço abaixo do sugerido no canal fica destacado", () => {
    const result = calculateChannelPrice({ ...base, currentPrice: 50 });
    expect(result.profit).toBeCloseTo(-1, 2);
    expect(result.belowDesired).toBe(true);
  });

  it("preço igual ao sugerido arredondado não conta como abaixo da margem", () => {
    const suggested = calculateChannelPrice({ ...base, currentPrice: null }).suggestedPrice!;
    expect(calculateChannelPrice({ ...base, currentPrice: Number(suggested.toFixed(2)) }).belowDesired).toBe(false);
  });

  it("canal sem taxa usa só a administrativa, igual ao preço sugerido geral sem cartão", () => {
    const result = calculateChannelPrice({ ...base, adminFee: 0.05, channel: { commission: 0, fixedFee: 0 }, currentPrice: 100 });
    expect(result.suggestedPrice).toBeCloseTo(
      calculateRecommendedPrice({ fixedCostsPerUnit: 44, feesPercentage: 0.05, desiredMargin: 0.37 }),
      6
    );
  });

  it("sem preço atual não há lucro nem destaque", () => {
    expect(calculateChannelPrice({ ...base, currentPrice: null })).toMatchObject({
      profit: null,
      margin: null,
      belowDesired: false,
    });
  });

  it("taxas somando 100% ou mais: sem preço possível e sempre destacado", () => {
    const result = calculateChannelPrice({ ...base, adminFee: 0.5, channel: { commission: 0.5, fixedFee: 0 }, currentPrice: 100 });
    expect(result.suggestedPrice).toBeNull();
    expect(result.belowDesired).toBe(true);
  });
});
