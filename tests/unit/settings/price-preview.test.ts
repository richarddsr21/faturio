import { describe, expect, it } from "vitest";
import { salePreview, suggestedPrice } from "@/lib/settings/price-preview";

const zero = { packagingCost: 0, shippingCost: 0, giftCost: 0, trafficCost: 0, adminFee: 0, cardFee: 0 };

describe("salePreview", () => {
  it("bate com a referência: custo 25,90 vendendo a 59,90 lucra 34,00 (56,8%)", () => {
    const preview = salePreview(25.9, 59.9, zero);
    expect(preview.realCost).toBeCloseTo(25.9);
    expect(preview.profit).toBeCloseTo(34);
    expect(preview.margin).toBeCloseTo(0.5676, 4);
  });

  it("desconta custos por venda e taxas sobre o preço, como o register_sale", () => {
    const preview = salePreview(20, 100, {
      packagingCost: 2,
      shippingCost: 5,
      giftCost: 1,
      trafficCost: 4,
      adminFee: 0.03,
      cardFee: 0.05,
    });
    expect(preview.perSaleCosts).toBe(12);
    expect(preview.feesRate).toBeCloseTo(0.08);
    expect(preview.feesAmount).toBeCloseTo(8);
    expect(preview.profit).toBeCloseTo(60);
  });

  it("sem preço não há margem", () => {
    expect(salePreview(10, 0, zero).margin).toBeNull();
  });
});

describe("suggestedPrice", () => {
  it("usa a mesma fórmula do formulário de produto", () => {
    // (25,90 + 0) × 1,4 ÷ (1 − 0,05)
    expect(suggestedPrice({ cost: 25.9, entryShipping: 0 }, { ...zero, cardFee: 0.05 }, 0.4)).toBeCloseTo(
      38.168,
      3
    );
  });

  it("taxas de 100% ou mais não têm preço possível", () => {
    expect(suggestedPrice({ cost: 10, entryShipping: 0 }, { ...zero, adminFee: 0.5, cardFee: 0.5 }, 0.4)).toBeNull();
  });
});
