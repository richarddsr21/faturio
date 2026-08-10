"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  name: z.string().min(1, "Informe o nome do produto"),
  sku: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().min(0, "Não pode ser negativo"),
  entryShipping: z.number().min(0, "Não pode ser negativo").default(0),
  currentPrice: z.number().min(0, "Não pode ser negativo").optional(),
  desiredMargin: z.number().min(0).max(0.9999).optional(),
  minimumStock: z.number().int().min(0).default(0),
});

export interface ProductActionResult {
  success: boolean;
  productId?: string;
  error?: string;
}

export async function createProduct(
  input: z.infer<typeof productSchema> & { initialStock?: number }
): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const initialStock = input.initialStock && input.initialStock > 0 ? input.initialStock : 0;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      supplier: parsed.data.supplier || null,
      cost: parsed.data.cost,
      entry_shipping: parsed.data.entryShipping,
      current_price: parsed.data.currentPrice ?? null,
      desired_margin: parsed.data.desiredMargin ?? null,
      stock_quantity: initialStock,
      minimum_stock: parsed.data.minimumStock,
    })
    .select()
    .single();

  if (error || !product) {
    return { success: false, error: "Não foi possível criar o produto. Tente novamente." };
  }

  if (initialStock > 0) {
    await supabase.from("inventory_movements").insert({
      user_id: user.id,
      product_id: product.id,
      type: "initial",
      quantity: initialStock,
      unit_cost: parsed.data.cost,
      reason: "Estoque inicial",
    });
  }

  return { success: true, productId: product.id };
}

export async function updateProduct(
  productId: string,
  input: z.infer<typeof productSchema>
): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      supplier: parsed.data.supplier || null,
      cost: parsed.data.cost,
      entry_shipping: parsed.data.entryShipping,
      current_price: parsed.data.currentPrice ?? null,
      desired_margin: parsed.data.desiredMargin ?? null,
      minimum_stock: parsed.data.minimumStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    return { success: false, error: "Não foi possível salvar o produto. Tente novamente." };
  }

  return { success: true, productId };
}

export async function deactivateProduct(productId: string): Promise<ProductActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    return { success: false, error: "Não foi possível remover o produto. Tente novamente." };
  }

  return { success: true, productId };
}
