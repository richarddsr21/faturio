import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Informe o nome do produto"),
  sku: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().min(0, "Não pode ser negativo"),
  entryShipping: z.number().min(0, "Não pode ser negativo").default(0),
  currentPrice: z.number().min(0, "Não pode ser negativo").optional(),
  desiredMargin: z.number().min(0).max(999.9999).optional(),
  minimumStock: z.number().int().min(0).default(0),
  initialStock: z.number().int().min(0).optional(),
  currentStock: z.number().int().min(0).optional(),
  // Custos que por padrão vêm de `settings` (globais), mas podem ser sobrescritos por
  // produto. `undefined` aqui vira NULL no banco = "usa o valor padrão de settings".
  packagingCost: z.number().min(0, "Não pode ser negativo").optional(),
  shippingCost: z.number().min(0, "Não pode ser negativo").optional(),
  giftCost: z.number().min(0, "Não pode ser negativo").optional(),
  adminFee: z.number().min(0).max(0.9999).optional(),
  cardFee: z.number().min(0).max(0.9999).optional(),
});

export type ProductFieldsValues = z.infer<typeof productSchema>;
