"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";

export interface ProductActionResult {
  success: boolean;
  productId?: string;
  error?: string;
}

export async function createProduct(
  input: z.infer<typeof productSchema>
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

  const initialStock =
    parsed.data.initialStock && parsed.data.initialStock > 0 ? parsed.data.initialStock : 0;

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
    const { error: movementError } = await supabase.from("inventory_movements").insert({
      user_id: user.id,
      product_id: product.id,
      type: "initial",
      quantity: initialStock,
      unit_cost: parsed.data.cost,
      reason: "Estoque inicial",
    });

    if (movementError) {
      // Produto já foi criado; segue para a lista mesmo com o estoque inicial não
      // registrado — o usuário pode ajustar o estoque manualmente por lá.
      redirect("/dashboard/produtos");
    }
  }

  redirect("/dashboard/produtos");
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

  redirect("/dashboard/produtos");
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

  redirect("/dashboard/produtos");
}
