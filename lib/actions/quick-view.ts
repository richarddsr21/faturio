"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateGoalProgress } from "@/lib/finance/goals";
import { calculateAverageTicket } from "@/lib/finance/projection";

const RECENT_LIMIT = 5;
const LOW_STOCK_LIMIT = 8;

const sectionSchema = z.enum(["produtos", "estoque", "vendas", "metas"]);

export type QuickViewSection = z.infer<typeof sectionSchema>;

export interface QuickViewProductSettings {
  packagingCost: number;
  shippingCost: number;
  giftCost: number;
  adminFee: number;
  cardFee: number;
  desiredMargin: number;
}

export type QuickViewData =
  | {
      section: "produtos";
      total: number;
      withoutPrice: number;
      recent: { id: string; name: string; cost: number; currentPrice: number | null }[];
      /** Padrões de `settings` para o cálculo do preço sugerido no formulário. */
      settings: QuickViewProductSettings;
    }
  | {
      section: "estoque";
      totalUnits: number;
      lowStockCount: number;
      lowStock: { id: string; name: string; stock: number; minimum: number }[];
      /** Todos os produtos ativos, para escolher qual movimentar. */
      products: { id: string; name: string; stock: number }[];
    }
  | {
      section: "vendas";
      todayRevenue: number;
      monthRevenue: number;
      monthCount: number;
      recent: {
        id: string;
        saleDate: string;
        customerName: string | null;
        paymentMethod: string;
        grossRevenue: number;
      }[];
      /** Produtos ativos para o formulário de venda. */
      products: { id: string; name: string; currentPrice: number }[];
    }
  | {
      section: "metas";
      month: number;
      year: number;
      goal: number | null;
      revenue: number;
      progress: number; // 0–1
      remaining: number;
      estimatedSalesNeeded: number;
    };

export type QuickViewResult =
  | { success: true; data: QuickViewData }
  | { success: false; error: string };

// sale_date volta do Supabase como "…+00:00", e toISOString() gera "…Z": compara como Date,
// nunca como texto.
function isOnOrAfter(date: string, boundary: string) {
  return new Date(date).getTime() >= new Date(boundary).getTime();
}

/**
 * Resumo de uma área do painel para os atalhos da Visão geral, com os dados que o
 * formulário de cadastro do modal precisa. Lê só dados do usuário da sessão (RLS + filtro
 * por user_id); os limites de mês seguem a mesma regra da Visão geral.
 */
export async function getQuickView(section: QuickViewSection): Promise<QuickViewResult> {
  const parsed = sectionSchema.safeParse(section);
  if (!parsed.success) {
    return { success: false, error: "Área inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(year, now.getMonth() + 1, 1).toISOString();
  const failed = { success: false as const, error: "Não foi possível carregar. Tente novamente." };

  switch (parsed.data) {
    case "produtos": {
      const [{ data: products, error }, { data: recent }, { data: settings }] = await Promise.all([
        supabase.from("products").select("current_price").eq("user_id", user.id).eq("status", "active"),
        supabase
          .from("products")
          .select("id, name, cost, current_price")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase
          .from("settings")
          .select("packaging_cost, shipping_cost, gift_cost, admin_fee, card_fee, desired_margin")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (error) return failed;
      return {
        success: true,
        data: {
          section: "produtos",
          total: products.length,
          withoutPrice: products.filter((p) => p.current_price === null).length,
          recent: (recent ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            cost: Number(p.cost),
            currentPrice: p.current_price !== null ? Number(p.current_price) : null,
          })),
          settings: {
            packagingCost: Number(settings?.packaging_cost ?? 0),
            shippingCost: Number(settings?.shipping_cost ?? 0),
            giftCost: Number(settings?.gift_cost ?? 0),
            adminFee: Number(settings?.admin_fee ?? 0),
            cardFee: Number(settings?.card_fee ?? 0),
            desiredMargin: Number(settings?.desired_margin ?? 0),
          },
        },
      };
    }

    case "estoque": {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, minimum_stock")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("name");
      if (error) return failed;
      // Mesma regra do card "Estoque" da Visão geral: abaixo do mínimo.
      const low = products
        .filter((p) => p.stock_quantity < p.minimum_stock)
        .sort((a, b) => a.stock_quantity - b.stock_quantity);
      return {
        success: true,
        data: {
          section: "estoque",
          totalUnits: products.reduce((sum, p) => sum + p.stock_quantity, 0),
          lowStockCount: low.length,
          lowStock: low.slice(0, LOW_STOCK_LIMIT).map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock_quantity,
            minimum: p.minimum_stock,
          })),
          products: products.map((p) => ({ id: p.id, name: p.name, stock: p.stock_quantity })),
        },
      };
    }

    case "vendas": {
      const startOfToday = new Date(year, now.getMonth(), now.getDate()).toISOString();
      const [{ data: monthSales, error }, { data: recent }, { data: products }] = await Promise.all([
        supabase
          .from("sales")
          .select("sale_date, gross_revenue")
          .eq("user_id", user.id)
          .gte("sale_date", startOfMonth)
          .lt("sale_date", startOfNextMonth),
        supabase
          .from("sales")
          .select("id, sale_date, customer_name, payment_method, gross_revenue")
          .eq("user_id", user.id)
          .order("sale_date", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase
          .from("products")
          .select("id, name, current_price")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("name"),
      ]);
      if (error) return failed;
      return {
        success: true,
        data: {
          section: "vendas",
          todayRevenue: monthSales
            .filter((s) => isOnOrAfter(s.sale_date, startOfToday))
            .reduce((sum, s) => sum + Number(s.gross_revenue), 0),
          monthRevenue: monthSales.reduce((sum, s) => sum + Number(s.gross_revenue), 0),
          monthCount: monthSales.length,
          recent: (recent ?? []).map((s) => ({
            id: s.id,
            saleDate: s.sale_date,
            customerName: s.customer_name,
            paymentMethod: s.payment_method,
            grossRevenue: Number(s.gross_revenue),
          })),
          products: (products ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            currentPrice: p.current_price !== null ? Number(p.current_price) : 0,
          })),
        },
      };
    }

    case "metas": {
      const [{ data: goal }, { data: sales, error }] = await Promise.all([
        supabase
          .from("goals")
          .select("revenue_goal")
          .eq("user_id", user.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("sales")
          .select("gross_revenue")
          .eq("user_id", user.id)
          .gte("sale_date", startOfMonth)
          .lt("sale_date", startOfNextMonth),
      ]);
      if (error) return failed;
      const revenue = sales.reduce((sum, s) => sum + Number(s.gross_revenue), 0);
      const goalValue = goal ? Number(goal.revenue_goal) : null;
      const progress = calculateGoalProgress({
        goal: goalValue ?? 0,
        currentRevenue: revenue,
        averageTicket: calculateAverageTicket(revenue, sales.length),
      });
      return {
        success: true,
        data: {
          section: "metas",
          month,
          year,
          goal: goalValue,
          revenue,
          progress: progress.progressPercentage,
          remaining: progress.remaining,
          estimatedSalesNeeded: progress.estimatedSalesNeeded,
        },
      };
    }
  }
}
