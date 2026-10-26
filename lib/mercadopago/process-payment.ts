import { createAdminClient } from "@/lib/supabase/admin";
import { findOrInviteCustomer } from "@/lib/mercadopago/customer-account";

export interface MercadoPagoPayment {
  id: string;
  status: string;
  externalReference: string;
}

export interface ProcessPaymentResult {
  created: boolean;
  reason?: "already_processed" | "not_approved" | "subscription_checkout";
  userId?: string;
  /** Só quando created = true: dados do checkout, usados na notificação de venda. */
  customer?: { name: string; email: string };
}

export async function processPayment(
  payment: MercadoPagoPayment
): Promise<ProcessPaymentResult> {
  const admin = createAdminClient();

  const { data: checkout, error: checkoutError } = await admin
    .from("pending_checkouts")
    .select()
    .eq("id", payment.externalReference)
    .single();

  if (checkoutError || !checkout) {
    throw new Error(
      `pending_checkout não encontrado para external_reference=${payment.externalReference}`
    );
  }

  // Checkout de assinatura mensal: cada cobrança também gera uma notificação "payment" com o
  // mesmo external_reference, mas quem trata é o webhook de assinatura. Sem isso, o valor
  // mensal (menor que 129,90) marcaria o checkout como falho.
  if (checkout.plan) {
    return { created: false, reason: "subscription_checkout" };
  }

  if (payment.status !== "approved") {
    await admin
      .from("pending_checkouts")
      .update({ status: "failed", mercadopago_payment_id: payment.id })
      .eq("id", checkout.id);
    return { created: false, reason: "not_approved" };
  }

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("mercadopago_payment_id", payment.id)
    .maybeSingle();

  if (existing) {
    return { created: false, reason: "already_processed" };
  }

  const { userId, isNewUser } = await findOrInviteCustomer(admin, checkout);

  if (!isNewUser) {
    // Usuário reaproveitado: garante que ele ainda não tem uma assinatura vitalícia ativa
    // antes de inserir outra (evita depender só da constraint do banco).
    const { data: activeSubscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("plan", "lifetime")
      .maybeSingle();

    if (activeSubscription) {
      return { created: false, reason: "already_processed" };
    }
  }

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: userId,
    plan: "lifetime",
    status: "active",
    mercadopago_payment_id: payment.id,
    amount: 129.9,
    started_at: new Date().toISOString(),
  });

  if (subError) {
    // 23505 = unique_violation — outra chamada concorrente do webhook já processou
    if (subError.code === "23505") {
      return { created: false, reason: "already_processed" };
    }
    throw subError;
  }

  if (isNewUser) {
    const { error: settingsError } = await admin.from("settings").insert({ user_id: userId });
    if (settingsError) {
      throw new Error(`Falha ao inserir configurações: ${settingsError.message}`);
    }
  }

  await admin
    .from("pending_checkouts")
    .update({ status: "completed", mercadopago_payment_id: payment.id })
    .eq("id", checkout.id);

  return { created: true, userId, customer: { name: checkout.name, email: checkout.email } };
}
