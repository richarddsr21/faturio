import { describe, expect, it } from "vitest";
import { calculateSaleFees, describeChannelFees } from "@/lib/finance/channels";

const shopee = { commission: 0.14, fixedFee: 4 };
const noFee = { commission: 0, fixedFee: 0 };

describe("calculateSaleFees", () => {
  it("soma taxa administrativa e comissão do canal sobre o faturamento, mais a taxa fixa por peça", () => {
    // 3 peças a R$ 50 = R$ 150; 2% adm + 14% Shopee = R$ 24; + 3 × R$ 4 = R$ 36
    const fees = calculateSaleFees({
      items: [{ quantity: 3, unitPrice: 50, adminFee: 0.02 }],
      discount: 0,
      channel: shopee,
    });
    expect(fees).toBeCloseTo(36, 2);
  });

  it("canal sem taxa cobra só a administrativa", () => {
    const fees = calculateSaleFees({ items: [{ quantity: 2, unitPrice: 50, adminFee: 0.05 }], discount: 0, channel: noFee });
    expect(fees).toBeCloseTo(5, 2);
  });

  it("taxa fixa conta por peça, não por venda", () => {
    const fixed = { commission: 0, fixedFee: 6.25 };
    expect(calculateSaleFees({ items: [{ quantity: 1, unitPrice: 0, adminFee: 0 }], discount: 0, channel: fixed })).toBeCloseTo(6.25, 2);
    expect(calculateSaleFees({ items: [{ quantity: 5, unitPrice: 0, adminFee: 0 }], discount: 0, channel: fixed })).toBeCloseTo(31.25, 2);
  });

  it("cada item paga a sua taxa administrativa, com o desconto rateado (#70)", () => {
    // A: R$ 100 com 10% próprio; B: R$ 100 com 2% de settings; desconto R$ 20 → cada um vale R$ 90
    const fees = calculateSaleFees({
      items: [
        { quantity: 1, unitPrice: 100, adminFee: 0.1 },
        { quantity: 1, unitPrice: 100, adminFee: 0.02 },
      ],
      discount: 20,
      channel: noFee,
    });
    expect(fees).toBeCloseTo(90 * 0.1 + 90 * 0.02, 2);
  });

  it("com a mesma taxa em todos os itens, é igual à taxa sobre o faturamento", () => {
    const fees = calculateSaleFees({
      items: [
        { quantity: 2, unitPrice: 30, adminFee: 0.05 },
        { quantity: 1, unitPrice: 40, adminFee: 0.05 },
      ],
      discount: 10,
      channel: shopee,
    });
    expect(fees).toBeCloseTo(90 * (0.05 + 0.14) + 3 * 4, 2);
  });
});

describe("describeChannelFees", () => {
  it("descreve comissão e taxa fixa", () => {
    expect(describeChannelFees({ commission: 0.14, fixedFee: 4 })).toBe("14% + R$ 4,00 por peça");
    expect(describeChannelFees({ commission: 0.125, fixedFee: 0 })).toBe("12,5%");
    expect(describeChannelFees({ commission: 0, fixedFee: 6.25 })).toBe("R$ 6,25 por peça");
    expect(describeChannelFees({ commission: 0, fixedFee: 0 })).toBe("Sem taxa");
  });
});
