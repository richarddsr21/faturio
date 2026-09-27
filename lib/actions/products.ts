"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";
import { MAX_IMPORT_ROWS, normalizeSku } from "@/lib/produtos/import-products";

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
      packaging_cost: parsed.data.packagingCost ?? null,
      shipping_cost: parsed.data.shippingCost ?? null,
      gift_cost: parsed.data.giftCost ?? null,
      admin_fee: parsed.data.adminFee ?? null,
      card_fee: parsed.data.cardFee ?? null,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  let stockDelta = 0;
  if (parsed.data.currentStock !== undefined) {
    const { data: current, error: currentError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .eq("user_id", user.id)
      .single();

    if (currentError || !current) {
      return { success: false, error: "Produto não encontrado." };
    }

    stockDelta = parsed.data.currentStock - current.stock_quantity;
  }

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
      packaging_cost: parsed.data.packagingCost ?? null,
      shipping_cost: parsed.data.shippingCost ?? null,
      gift_cost: parsed.data.giftCost ?? null,
      admin_fee: parsed.data.adminFee ?? null,
      card_fee: parsed.data.cardFee ?? null,
      ...(stockDelta !== 0 ? { stock_quantity: parsed.data.currentStock } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Não foi possível salvar o produto. Tente novamente." };
  }

  if (stockDelta !== 0) {
    await supabase.from("inventory_movements").insert({
      user_id: user.id,
      product_id: productId,
      type: "adjustment",
      quantity: stockDelta,
      reason: "Ajuste manual via edição do produto",
    });
  }

  redirect("/dashboard/produtos");
}

export async function deactivateProduct(productId: string): Promise<ProductActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("products")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Não foi possível remover o produto. Tente novamente." };
  }

  redirect("/dashboard/produtos");
}

const importProductsSchema = z
  .array(
    productSchema
      .pick({
        name: true,
        sku: true,
        category: true,
        supplier: true,
        cost: true,
        entryShipping: true,
        currentPrice: true,
        desiredMargin: true,
        minimumStock: true,
      })
      .extend({
        name: z.string().trim().min(1, "Informe o nome do produto"),
        initialStock: z.number().int().min(0).default(0),
      })
  )
  .min(1, "Nenhum produto para importar.")
  .max(MAX_IMPORT_ROWS, `Importe no máximo ${MAX_IMPORT_ROWS} produtos por vez.`);

export interface ImportProductsResult {
  success: boolean;
  imported?: number;
  error?: string;
}

/** SKUs já cadastrados pelo usuário da sessão, normalizados — para a pré-visualização. */
export async function getProductSkus(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("products")
    .select("sku")
    .eq("user_id", user.id)
    .not("sku", "is", null);

  return (data ?? []).map((p) => normalizeSku(p.sku as string));
}

/**
 * Cria os produtos da planilha numa única transação (função import_products). Produtos
 * com SKU já cadastrado são pulados pelo banco.
 */
export async function importProducts(
  input: z.input<typeof importProductsSchema>
): Promise<ImportProductsResult> {
  const parsed = importProductsSchema.safeParse(input);
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

  const { data, error } = await supabase.rpc("import_products", {
    p_products: parsed.data.map((p) => ({
      name: p.name,
      sku: p.sku || null,
      category: p.category || null,
      supplier: p.supplier || null,
      cost: p.cost,
      entry_shipping: p.entryShipping,
      current_price: p.currentPrice ?? null,
      desired_margin: p.desiredMargin ?? null,
      initial_stock: p.initialStock,
      minimum_stock: p.minimumStock,
    })),
  });

  if (error) {
    return { success: false, error: "Não foi possível importar os produtos. Nenhum produto foi criado." };
  }

  return { success: true, imported: data as number };
}
