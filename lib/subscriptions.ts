import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, SubscriptionAccessRow } from "@/lib/plans";

export interface SubscriptionRow extends SubscriptionAccessRow {
  id: string;
  amount: number;
  mercadopago_preapproval_id: string | null;
}

/**
 * Assinaturas que podem dar acesso (o resto é histórico). Com o client da sessão, a RLS
 * restringe às do próprio usuário; o filtro por user_id é só para o índice.
 * pending entra para o proxy saber que a assinatura foi autorizada e falta o pagamento.
 */
export async function loadSubscriptions(supabase: SupabaseClient, userId: string): Promise<SubscriptionRow[]> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id, plan, status, current_period_end, amount, mercadopago_preapproval_id")
    .eq("user_id", userId)
    .in("status", ["active", "past_due", "cancelled", "pending"]);

  return (data ?? []).map((row) => ({
    id: row.id,
    plan: row.plan as Plan,
    status: row.status,
    current_period_end: row.current_period_end,
    amount: Number(row.amount),
    mercadopago_preapproval_id: row.mercadopago_preapproval_id,
  }));
}
