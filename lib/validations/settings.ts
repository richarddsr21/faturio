import { z } from "zod";
import { fractionToPercent, percentToFraction } from "@/lib/utils";

export const settingsFieldsBaseSchema = z.object({
  packagingCost: z.number().min(0, "Não pode ser negativo"),
  giftCost: z.number().min(0, "Não pode ser negativo"),
  shippingCost: z.number().min(0, "Não pode ser negativo"),
  adminFee: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
  cardFee: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
  trafficCost: z.number().min(0, "Não pode ser negativo"),
  desiredMargin: z.number().min(0).max(999.9999, "Valor muito alto"),
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
  adminFee: z.number().min(0).max(99.99, "Informe um percentual menor que 100%"),
  cardFee: z.number().min(0).max(99.99, "Informe um percentual menor que 100%"),
  desiredMargin: z.number().min(0).max(99999.99, "Valor muito alto"),
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
