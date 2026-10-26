import { createAdminClient } from "@/lib/supabase/admin";
import { findOrInviteCustomer } from "@/lib/mercadopago/customer-account";
import {
  getMercadoPagoPreapproval,
  type MercadoPagoAuthorizedPayment,
  type MercadoPagoPreapproval,
} from "@/lib/mercadopago/client";
import { expectedMonthlyPrice, isRecurringPlan, sameAmount, type RecurringPlan } from "@/lib/plans";

// Webhook das assinaturas mensais (#11). Idempotente: o Mercado Pago reenvia a mesma
// notificação várias vezes e fora de ordem (a cobrança pode chegar antes da assinatura).
//
// Ciclo de uma assinatura:
//   preapproval authorized   → subscriptions pending (cliente convidado, ainda sem acesso)
//   cobrança aprovada        → active, current_period_end + 1 mês (apply_subscription_payment)
//   cobrança recusada        → past_due (acesso até current_period_end; o MP tenta de novo)
//   preapproval cancelled    → cancelled (acesso até current_period_end)
// Vitalício fazendo upgrade (pending_checkouts.user_id preenchido) não cria conta nova.

const EXPECTED_CURRENCY = "BRL";

interface SubscriptionCheckout {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  user_id: string | null;
}

/** Preço que o checkout deveria cobrar; null se o checkout não é de assinatura válida. */
export function checkoutMonthlyPrice(checkout: Pick<SubscriptionCheckout, "plan" | "user_id">): number | null {
  if (!isRecurringPlan(checkout.plan)) return null;
  return expectedMonthlyPrice(checkout.plan, checkout.user_id !== null);
}

/** Valor e moeda batem com o preço decidido no servidor (ninguém altera o valor no caminho). */
export function matchesExpectedPrice(amount: number, currency: string, expected: number | null): boolean {
  return expected !== null && currency === EXPECTED_CURRENCY && sameAmount(amount, expected);
}

/**
 * approved: cobrança paga. failed: recusada (o MP marca a cobrança como recycling enquanto
 * tenta de novo). ignored: agendada ou em processamento, nada a fazer ainda.
 */
export function classifyAuthorizedPayment(
  payment: Pick<MercadoPagoAuthorizedPayment, "status" | "payment">
): "approved" | "failed" | "ignored" {
  if (payment.payment?.status === "approved") return "approved";
  if (payment.status === "recycling" || payment.payment?.status === "rejected") return "failed";
  return "ignored";
}

export type SyncPreapprovalResult =
  | { outcome: "subscribed"; userId: string; plan: RecurringPlan }
  | { outcome: "already_processed" | "pending" | "cancelled" | "ignored" | "invalid_amount" };

export async function syncPreapproval(preapproval: MercadoPagoPreapproval): Promise<SyncPreapprovalResult> {
  const admin = createAdminClient();

  const { data: checkout, error: checkoutError } = await admin
    .from("pending_checkouts")
    .select("id, name, email, plan, user_id")
    .eq("id", preapproval.external_reference)
    .maybeSingle<SubscriptionCheckout>();

  if (checkoutError || !checkout) {
    throw new Error(`pending_checkout não encontrado para external_reference=${preapproval.external_reference}`);
  }
  if (!isRecurringPlan(checkout.plan)) {
    return { outcome: "ignored" };
  }
  const plan = checkout.plan;

  if (preapproval.status === "cancelled") {
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("mercadopago_preapproval_id", preapproval.id)
      .in("status", ["pending", "active", "past_due"]);
    if (error) throw error;
    return { outcome: "cancelled" };
  }

  // pending: o cliente ainda não terminou o checkout. paused: o MP para de cobrar e o acesso
  // acaba sozinho no fim do período pago; voltar a authorized não exige nada daqui.
  if (preapproval.status !== "authorized") {
    return { outcome: preapproval.status === "pending" ? "pending" : "ignored" };
  }

  const expected = checkoutMonthlyPrice(checkout);
  const { transaction_amount, currency_id } = preapproval.auto_recurring;
  if (!matchesExpectedPrice(transaction_amount, currency_id, expected)) {
    await admin
      .from("pending_checkouts")
      .update({ status: "failed", mercadopago_preapproval_id: preapproval.id })
      .eq("id", checkout.id);
    return { outcome: "invalid_amount" };
  }

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("mercadopago_preapproval_id", preapproval.id)
    .maybeSingle();
  if (existing) {
    return { outcome: "already_processed" };
  }

  // Upgrade de vitalício: a conta é a da sessão que iniciou o checkout (gravada no servidor).
  const userId = checkout.user_id ?? (await findOrInviteCustomer(admin, checkout)).userId;

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: userId,
    plan,
    status: "pending",
    amount: expected,
    mercadopago_preapproval_id: preapproval.id,
    started_at: new Date().toISOString(),
  });
  if (subError) {
    // 23505 = unique_violation — outra chamada concorrente do webhook já processou
    if (subError.code === "23505") return { outcome: "already_processed" };
    throw subError;
  }

  // Conta nova precisa de settings; numa conta existente o upsert não faz nada. Fica fora
  // do "é usuário novo?" para uma nova tentativa do webhook completar o que faltou.
  const { error: settingsError } = await admin
    .from("settings")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (settingsError) {
    throw new Error(`Falha ao inserir configurações: ${settingsError.message}`);
  }

  await admin
    .from("pending_checkouts")
    .update({ status: "completed", mercadopago_preapproval_id: preapproval.id })
    .eq("id", checkout.id);

  return { outcome: "subscribed", userId, plan };
}

export type ApplyAuthorizedPaymentResult =
  | { outcome: "paid"; userId: string; plan: RecurringPlan; firstPayment: boolean }
  | { outcome: "already_processed" | "past_due" | "ignored" | "invalid_amount" };

interface SubscriptionForPayment {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
}

async function findSubscriptionByPreapproval(preapprovalId: string): Promise<SubscriptionForPayment | null> {
  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("id, user_id, plan, amount")
    .eq("mercadopago_preapproval_id", preapprovalId)
    .maybeSingle<SubscriptionForPayment>();
  return data;
}

export async function applyAuthorizedPayment(
  payment: MercadoPagoAuthorizedPayment,
  fetchPreapproval: (id: string) => Promise<MercadoPagoPreapproval> = getMercadoPagoPreapproval
): Promise<ApplyAuthorizedPaymentResult> {
  const kind = classifyAuthorizedPayment(payment);
  if (kind === "ignored") return { outcome: "ignored" };

  let subscription = await findSubscriptionByPreapproval(payment.preapproval_id);
  if (!subscription) {
    // A cobrança chegou antes da notificação da assinatura: registra a assinatura primeiro.
    const synced = await syncPreapproval(await fetchPreapproval(payment.preapproval_id));
    // Assinatura recusada (valor errado, checkout que não é de assinatura): não há o que
    // estender, e lançar faria o Mercado Pago reenviar para sempre.
    if (synced.outcome === "invalid_amount" || synced.outcome === "ignored") return { outcome: "invalid_amount" };
    subscription = await findSubscriptionByPreapproval(payment.preapproval_id);
  }
  if (!subscription || !isRecurringPlan(subscription.plan)) {
    // Lançar faz o Mercado Pago tentar de novo mais tarde.
    throw new Error(`Assinatura não encontrada para preapproval_id=${payment.preapproval_id}`);
  }

  const admin = createAdminClient();

  if (kind === "failed") {
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("id", subscription.id)
      .eq("status", "active");
    if (error) throw error;
    return { outcome: "past_due" };
  }

  if (!matchesExpectedPrice(payment.transaction_amount, payment.currency_id, Number(subscription.amount))) {
    return { outcome: "invalid_amount" };
  }

  const { data: applied, error } = await admin.rpc("apply_subscription_payment", {
    p_subscription_id: subscription.id,
    p_authorized_payment_id: String(payment.id),
    p_amount: payment.transaction_amount,
    p_paid_at: new Date().toISOString(),
  });
  if (error) throw error;
  if (!applied) return { outcome: "already_processed" };

  const { count } = await admin
    .from("subscription_payments")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", subscription.id);

  return { outcome: "paid", userId: subscription.user_id, plan: subscription.plan, firstPayment: count === 1 };
}
