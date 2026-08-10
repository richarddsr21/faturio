import { z } from "zod";

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
