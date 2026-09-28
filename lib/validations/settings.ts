import { z } from "zod";
import { fractionToPercent, percentToFraction } from "@/lib/utils";

// Os inputs usam `valueAsNumber`, então um campo vazio chega como NaN. Sem `error` no
// z.number(), o zod devolve a mensagem padrão em inglês ("Invalid input: expected number,
// received NaN") — por isso cada campo define a sua própria mensagem em português.
const packagingCost = z
  .number({ error: "Informe o custo de embalagem (use 0 se não tiver)" })
  .min(0, "O custo de embalagem não pode ser negativo");
const giftCost = z
  .number({ error: "Informe o custo de brinde (use 0 se não der brinde)" })
  .min(0, "O custo de brinde não pode ser negativo");
const shippingCost = z
  .number({ error: "Informe o frete médio (use 0 se não cobrar frete)" })
  .min(0, "O frete médio não pode ser negativo");
const trafficCost = z
  .number({ error: "Informe o custo de tráfego por venda (use 0 se não anunciar)" })
  .min(0, "O custo de tráfego não pode ser negativo");
const adminFee = z
  .number({ error: "Informe a taxa administrativa (use 0 se não tiver)" })
  .min(0, "A taxa administrativa não pode ser negativa");
const cardFee = z
  .number({ error: "Informe a taxa de cartão (use 0 se não tiver)" })
  .min(0, "A taxa de cartão não pode ser negativa");
const desiredMargin = z
  .number({ error: "Informe a margem desejada" })
  .min(0, "A margem desejada não pode ser negativa");

export const revenueGoalSchema = z
  .number({ error: "Informe a meta de faturamento do mês" })
  .min(0, "A meta de faturamento não pode ser negativa");

export const settingsFieldsBaseSchema = z.object({
  packagingCost,
  giftCost,
  shippingCost,
  adminFee: adminFee.max(0.9999, "A taxa administrativa precisa ser menor que 100%"),
  cardFee: cardFee.max(0.9999, "A taxa de cartão precisa ser menor que 100%"),
  trafficCost,
  desiredMargin: desiredMargin.max(999.9999, "A margem desejada está alta demais"),
});

export type SettingsFieldsValues = z.infer<typeof settingsFieldsBaseSchema>;

export function feesBelow100Percent(data: { adminFee: number; cardFee: number }) {
  return data.adminFee + data.cardFee < 1;
}

export const settingsFieldsSchema = settingsFieldsBaseSchema.refine(feesBelow100Percent, {
  message: "A soma de taxa administrativa e taxa de cartão precisa ser menor que 100%",
  path: ["cardFee"],
});

// Os formulários pedem taxa/margem como percentual (ex: 5 para 5%) em vez da fração armazenada
// no banco (0.05) — mais natural para o usuário digitar. `settingsFieldsBaseSchema`/
// `settingsFieldsSchema` continuam sendo a forma canônica (fração), usada pelas Server Actions
// e validada de novo lá; a conversão abaixo só existe na borda do formulário.
export const settingsFormFieldsBaseSchema = settingsFieldsBaseSchema.extend({
  adminFee: adminFee.max(99.99, "A taxa administrativa precisa ser menor que 100%"),
  cardFee: cardFee.max(99.99, "A taxa de cartão precisa ser menor que 100%"),
  desiredMargin: desiredMargin.max(99999.99, "A margem desejada está alta demais"),
});

export type SettingsFormFieldsValues = z.infer<typeof settingsFormFieldsBaseSchema>;

export function feesBelow100PercentUI(data: { adminFee: number; cardFee: number }) {
  return data.adminFee + data.cardFee < 100;
}

export const settingsFormFieldsSchema = settingsFormFieldsBaseSchema.refine(
  feesBelow100PercentUI,
  {
    message: "A soma de taxa administrativa e taxa de cartão precisa ser menor que 100%",
    path: ["cardFee"],
  }
);

export function settingsValuesToPercent(values: SettingsFieldsValues): SettingsFormFieldsValues {
  return {
    ...values,
    adminFee: fractionToPercent(values.adminFee),
    cardFee: fractionToPercent(values.cardFee),
    desiredMargin: fractionToPercent(values.desiredMargin),
  };
}

export function settingsValuesToFraction(values: SettingsFormFieldsValues): SettingsFieldsValues {
  return {
    ...values,
    adminFee: percentToFraction(values.adminFee),
    cardFee: percentToFraction(values.cardFee),
    desiredMargin: percentToFraction(values.desiredMargin),
  };
}
