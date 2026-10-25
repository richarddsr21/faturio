import { describe, expect, it } from "vitest";
import { calculateSaleFees, describeChannelFees } from "@/lib/finance/channels";

describe("calculateSaleFees", () => {
  it("soma taxa administrativa e comissão do canal sobre o faturamento, mais a taxa fixa por peça", () => {
    // 3 peças a R$ 50 = R$ 150; 2% adm + 14% Shopee = R$ 24; + 3 × R$ 4 = R$ 36
    const fees = calculateSaleFees({
      grossRevenue: 150,
      totalQuantity: 3,
      adminFee: 0.02,
      channel: { commission: 0.14, fixedFee: 4 },
    });
    expect(fees).toBeCloseTo(36, 2);
  });

  it("canal sem taxa cobra só a administrativa", () => {
    const fees = calculateSaleFees({
      grossRevenue: 100,
      totalQuantity: 2,
      adminFee: 0.05,
      channel: { commission: 0, fixedFee: 0 },
    });
    expect(fees).toBeCloseTo(5, 2);
  });

  it("taxa fixa conta por peça, não por venda", () => {
    const one = calculateSaleFees({ grossRevenue: 0, totalQuantity: 1, adminFee: 0, channel: { commission: 0, fixedFee: 6.25 } });
    const five = calculateSaleFees({ grossRevenue: 0, totalQuantity: 5, adminFee: 0, channel: { commission: 0, fixedFee: 6.25 } });
    expect(one).toBeCloseTo(6.25, 2);
    expect(five).toBeCloseTo(31.25, 2);
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
