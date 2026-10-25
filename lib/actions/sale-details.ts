"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SaleDetails } from "@/lib/vendas/sale-breakdown";

export type SaleDetailsResult = { success: true; sale: SaleDetails } | { success: false; error: string };

interface SaleDetailsRow {
  id: string;
  sale_date: string;
  customer_name: string | null;
  payment_method: string;
  discount: number | string;
  gross_revenue: number | string;
  fees: number | string;
  shipping_cost: number | string;
  packaging_cost: number | string;
  gift_cost: number | string;
  traffic_cost: number | string;
  net_profit: number | string;
  sales_channels: { name: string } | null;
  sale_items: {
    quantity: number;
    unit_price: number | string;
    unit_cost: number | string;
    subtotal: number | string;
    products: { name: string } | null;
  }[];
}

/** Detalhe de uma venda do usuário da sessão (RLS + filtro por user_id). */
export async function getSaleDetails(saleId: string): Promise<SaleDetailsResult> {
  if (!z.string().uuid().safeParse(saleId).success) {
    return { success: false, error: "Venda não encontrada." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, sale_date, customer_name, payment_method, discount, gross_revenue, fees, shipping_cost, packaging_cost, gift_cost, traffic_cost, net_profit, sales_channels(name), sale_items(quantity, unit_price, unit_cost, subtotal, products(name))"
    )
    .eq("id", saleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { success: false, error: "Não foi possível carregar a venda. Tente novamente." };
  if (!data) return { success: false, error: "Venda não encontrada." };

  const row = data as unknown as SaleDetailsRow;
  return {
    success: true,
    sale: {
      id: row.id,
      saleDate: row.sale_date,
      customerName: row.customer_name,
      paymentMethod: row.payment_method,
      channelName: row.sales_channels?.name ?? null,
      items: row.sale_items.map((item) => ({
        productName: item.products?.name ?? "Produto removido",
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        unitCost: Number(item.unit_cost),
        subtotal: Number(item.subtotal),
      })),
      discount: Number(row.discount),
      grossRevenue: Number(row.gross_revenue),
      fees: Number(row.fees),
      shippingCost: Number(row.shipping_cost),
      packagingCost: Number(row.packaging_cost),
      giftCost: Number(row.gift_cost),
      trafficCost: Number(row.traffic_cost),
      netProfit: Number(row.net_profit),
    },
  };
}
