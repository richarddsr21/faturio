import { z } from "zod";
import { fractionToPercent, percentToFraction } from "@/lib/utils";

export const settingsFieldsBaseSchema = z.object({
  packagingCost: z.number().min(0, "Não pode ser negativo"),
  giftCost: z.number().min(0, "Não pode ser negativo"),
  shippingCost: z.number().min(0, "Não pode ser negativo"),
  adminFee: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
  cardFee: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
  trafficCost: z.number().min(0, "Não pode ser negativo"),
  desiredMargin: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
});

export type SettingsFieldsValues = z.infer<typeof settingsFieldsBaseSchema>;

export function feesBelow100Percent(data: {
  adminFee: number;
  cardFee: number;
  desiredMargin: number;
}) {
  return data.adminFee + data.cardFee + data.desiredMargin < 1;
}

export const settingsFieldsSchema = settingsFieldsBaseSchema.refine(feesBelow100Percent, {
  message:
    "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
  path: ["desiredMargin"],
});

// Os formulários pedem taxa/margem como percentual (ex: 5 para 5%) em vez da fração armazenada
// no banco (0.05) — mais natural para o usuário digitar. `settingsFieldsBaseSchema`/
// `settingsFieldsSchema` continuam sendo a forma canônica (fração), usada pelas Server Actions
// e validada de novo lá; a conversão abaixo só existe na borda do formulário.
export const settingsFormFieldsBaseSchema = settingsFieldsBaseSchema.extend({
  adminFee: z.number().min(0).max(99.99, "Informe um percentual menor que 100%"),
  cardFee: z.number().min(0).max(99.99, "Informe um percentual menor que 100%"),
  desiredMargin: z.number().min(0).max(99.99, "Informe um percentual menor que 100%"),
});

export type SettingsFormFieldsValues = z.infer<typeof settingsFormFieldsBaseSchema>;

export function feesBelow100PercentUI(data: {
  adminFee: number;
  cardFee: number;
  desiredMargin: number;
}) {
  return data.adminFee + data.cardFee + data.desiredMargin < 100;
}

export const settingsFormFieldsSchema = settingsFormFieldsBaseSchema.refine(
  feesBelow100PercentUI,
  {
    message:
      "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
    path: ["desiredMargin"],
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
