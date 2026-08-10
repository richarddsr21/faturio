"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const movementSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(["entry", "adjustment", "return"]),
  quantity: z.number().int(),
  unitCost: z.number().min(0).optional(),
  reason: z.string().optional(),
});

export interface StockActionResult {
  success: boolean;
  error?: string;
}

export async function registerStockMovement(
  input: z.infer<typeof movementSchema>
): Promise<StockActionResult> {
  const parsed = movementSchema.safeParse(input);
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

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", parsed.data.productId)
    .single();

  if (productError || !product) {
    return { success: false, error: "Produto não encontrado." };
  }

  const delta =
    parsed.data.type === "adjustment" ? parsed.data.quantity : Math.abs(parsed.data.quantity);

  const newStock = product.stock_quantity + delta;
  if (newStock < 0) {
    return { success: false, error: "Esse ajuste deixaria o estoque negativo." };
  }

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    user_id: user.id,
    product_id: parsed.data.productId,
    type: parsed.data.type,
    quantity: delta,
    unit_cost: parsed.data.unitCost ?? null,
    reason: parsed.data.reason || null,
  });

  if (movementError) {
    return { success: false, error: "Não foi possível registrar o movimento. Tente novamente." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.productId);

  if (updateError) {
    return { success: false, error: "Não foi possível atualizar o estoque. Tente novamente." };
  }

  return { success: true };
}
