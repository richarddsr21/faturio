import { describe, it, expect } from "vitest";
import {
  revenueGoalSchema,
  settingsFieldsBaseSchema,
  settingsFormFieldsBaseSchema,
} from "@/lib/validations/settings";

const valid = {
  packagingCost: 2,
  giftCost: 0,
  shippingCost: 5,
  adminFee: 5,
  cardFee: 4,
  trafficCost: 0,
  desiredMargin: 30,
};

function messagesByField(result: ReturnType<typeof settingsFormFieldsBaseSchema.safeParse>) {
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe("mensagens de validação das configurações", () => {
  it("dá uma mensagem específica em português para cada campo vazio (NaN)", () => {
    const empty = Object.fromEntries(Object.keys(valid).map((key) => [key, Number.NaN]));
    const messages = messagesByField(settingsFormFieldsBaseSchema.safeParse(empty));

    expect(messages).toEqual({
      packagingCost: "Informe o custo de embalagem (use 0 se não tiver)",
      giftCost: "Informe o custo de brinde (use 0 se não der brinde)",
      shippingCost: "Informe o frete médio (use 0 se não cobrar frete)",
      adminFee: "Informe a taxa administrativa (use 0 se não tiver)",
      cardFee: "Informe a taxa de cartão (use 0 se não tiver)",
      trafficCost: "Informe o custo de tráfego por venda (use 0 se não anunciar)",
      desiredMargin: "Informe a margem desejada",
    });
  });

  it("dá uma mensagem específica para valores negativos", () => {
    const negative = Object.fromEntries(Object.keys(valid).map((key) => [key, -1]));
    const messages = messagesByField(settingsFormFieldsBaseSchema.safeParse(negative));

    expect(messages).toEqual({
      packagingCost: "O custo de embalagem não pode ser negativo",
      giftCost: "O custo de brinde não pode ser negativo",
      shippingCost: "O frete médio não pode ser negativo",
      adminFee: "A taxa administrativa não pode ser negativa",
      cardFee: "A taxa de cartão não pode ser negativa",
      trafficCost: "O custo de tráfego não pode ser negativo",
      desiredMargin: "A margem desejada não pode ser negativa",
    });
  });

  it("avisa quando a taxa passa de 100% (formulário e servidor)", () => {
    const formMessages = messagesByField(
      settingsFormFieldsBaseSchema.safeParse({ ...valid, adminFee: 100, cardFee: 100 }),
    );
    expect(formMessages).toEqual({
      adminFee: "A taxa administrativa precisa ser menor que 100%",
      cardFee: "A taxa de cartão precisa ser menor que 100%",
    });

    const serverResult = settingsFieldsBaseSchema.safeParse({ ...valid, adminFee: 1, cardFee: 0 });
    expect(serverResult.success).toBe(false);
    expect(serverResult.error?.issues[0].message).toBe(
      "A taxa administrativa precisa ser menor que 100%",
    );
  });

  it("aceita valores válidos", () => {
    expect(settingsFormFieldsBaseSchema.safeParse(valid).success).toBe(true);
  });

  it("dá mensagens em português para a meta de faturamento", () => {
    expect(revenueGoalSchema.safeParse(Number.NaN).error?.issues[0].message).toBe(
      "Informe a meta de faturamento do mês",
    );
    expect(revenueGoalSchema.safeParse(-10).error?.issues[0].message).toBe(
      "A meta de faturamento não pode ser negativa",
    );
    expect(revenueGoalSchema.safeParse(50000).success).toBe(true);
  });
});
