"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive("Informe uma quantidade válida"),
  unitPrice: z.number().min(0, "Informe um preço válido"),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um produto"),
  paymentMethod: z.string().min(1, "Informe a forma de pagamento"),
  discount: z.number().min(0).default(0),
});

export interface RegisterSaleResult {
  success: boolean;
  saleId?: string;
  error?: string;
}

export async function registerSale(
  input: z.infer<typeof saleSchema>
): Promise<RegisterSaleResult> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_sale", {
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_payment_method: parsed.data.paymentMethod,
    p_discount: parsed.data.discount,
  });

  if (error) {
    if (error.message.includes("estoque insuficiente")) {
      return { success: false, error: "Estoque insuficiente para um ou mais produtos." };
    }
    return { success: false, error: "Não foi possível registrar a venda. Tente novamente." };
  }

  redirect("/dashboard/vendas");
}
