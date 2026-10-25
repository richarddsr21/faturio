import { describe, expect, it } from "vitest";
import { saleBreakdown, type SaleDetails } from "@/lib/vendas/sale-breakdown";

// A venda do teste do #14: 2 × R$ 119,90 no TikTok Shop, peça a R$ 44, taxas R$ 27,98.
const sale: SaleDetails = {
  id: "s1",
  saleDate: "2026-10-25T15:00:00-03:00",
  customerName: "camila",
  paymentMethod: "pix",
  channelName: "TikTok Shop",
  items: [{ productName: "richard reis", quantity: 2, unitPrice: 119.9, unitCost: 44, subtotal: 239.8 }],
  discount: 0,
  grossRevenue: 239.8,
  fees: 27.98,
  shippingCost: 0,
  packagingCost: 0,
  giftCost: 0,
  trafficCost: 0,
  netProfit: 123.82,
};

describe("saleBreakdown", () => {
  it("lista custo dos produtos e taxas do canal, e omite custos zerados", () => {
    const result = saleBreakdown(sale);
    expect(result.itemsTotal).toBeCloseTo(239.8, 2);
    expect(result.deductions).toEqual([
      { label: "Custo dos produtos", amount: -88 },
      { label: "Taxas (TikTok Shop)", amount: -27.98 },
    ]);
    expect(result.profit).toBe(123.82);
    expect(result.margin).toBeCloseTo(0.5163, 4);
  });

  it("a soma das linhas fecha com o lucro gravado", () => {
    const full: SaleDetails = {
      ...sale,
      channelName: null,
      items: [
        { productName: "A", quantity: 1, unitPrice: 100, unitCost: 40, subtotal: 100 },
        { productName: "B", quantity: 3, unitPrice: 20, unitCost: 5, subtotal: 60 },
      ],
      discount: 10,
      grossRevenue: 150,
      fees: 12,
      shippingCost: 8,
      packagingCost: 2,
      giftCost: 1.5,
      trafficCost: 3,
      // 160 − 10 − 55 − 12 − 8 − 2 − 1,5 − 3
      netProfit: 68.5,
    };
    const result = saleBreakdown(full);
    expect(result.deductions.map((l) => l.label)).toEqual([
      "Desconto",
      "Custo dos produtos",
      "Taxas",
      "Frete",
      "Embalagem",
      "Brinde",
      "Tráfego pago",
    ]);
    const total = result.itemsTotal + result.deductions.reduce((sum, l) => sum + l.amount, 0);
    expect(total).toBeCloseTo(result.profit, 2);
  });

  it("venda de graça não tem margem", () => {
    expect(saleBreakdown({ ...sale, grossRevenue: 0, netProfit: -88 }).margin).toBeNull();
  });
});
