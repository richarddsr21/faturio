"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cancelMercadoPagoPreapproval, createMercadoPagoPreapproval } from "@/lib/mercadopago/client";
import {
  effectivePlan,
  expectedMonthlyPrice,
  LIFETIME_UPGRADE_PLANS,
  PLAN_NAMES,
  RECURRING_PLANS,
  type RecurringPlan,
} from "@/lib/plans";
import { loadSubscriptions } from "@/lib/subscriptions";

const checkoutSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
  plan: z.enum(RECURRING_PLANS, { error: "Escolha um plano" }),
});

export interface CheckoutResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

/**
 * Cria o checkout e a assinatura mensal no Mercado Pago. O preço sai do plano, decidido
 * aqui no servidor; o webhook confere de novo antes de liberar o acesso.
 */
async function createSubscriptionCheckout(input: {
  name: string;
  email: string;
  plan: RecurringPlan;
  amount: number;
  userId: string | null;
}): Promise<CheckoutResult> {
  const admin = createAdminClient();

  const { data: checkout, error } = await admin
    .from("pending_checkouts")
    .insert({ name: input.name, email: input.email, plan: input.plan, user_id: input.userId })
    .select("id")
    .single();

  if (error || !checkout) {
    return { success: false, error: "Não foi possível iniciar o checkout. Tente novamente." };
  }

  try {
    const preapproval = await createMercadoPagoPreapproval({
      externalReference: checkout.id,
      payerEmail: input.email,
      reason: `Faturio — Plano ${PLAN_NAMES[input.plan]}`,
      amount: input.amount,
    });
    await admin
      .from("pending_checkouts")
      .update({ mercadopago_preapproval_id: preapproval.id })
      .eq("id", checkout.id);
    return { success: true, redirectUrl: preapproval.init_point };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[checkout] Erro ao criar assinatura no Mercado Pago: ${errorMessage}`);
    return { success: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}

export async function startCheckout(input: {
  name: string;
  email: string;
  plan: string;
}): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  return createSubscriptionCheckout({
    ...parsed.data,
    amount: expectedMonthlyPrice(parsed.data.plan, false)!,
    userId: null,
  });
}

const upgradeSchema = z.enum(LIFETIME_UPGRADE_PLANS);

/** Vitalício assinando Pro ou IA com o preço especial. A conta é sempre a da sessão. */
export async function startLifetimeUpgrade(plan: string): Promise<CheckoutResult> {
  const parsed = upgradeSchema.safeParse(plan);
  if (!parsed.success) {
    return { success: false, error: "Escolha o plano Pro ou IA." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Entre na sua conta para continuar." };
  }

  const subscriptions = await loadSubscriptions(supabase, user.id);
  const now = new Date();
  if (!subscriptions.some((s) => s.plan === "lifetime" && s.status === "active")) {
    return { success: false, error: "O preço especial é só para quem tem o plano Vitalício." };
  }
  if (effectivePlan(subscriptions, now) !== "lifetime" || subscriptions.some((s) => s.status === "pending")) {
    return { success: false, error: "Você já tem uma assinatura mensal. Cancele a atual para trocar de plano." };
  }

  const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).single();
  if (!profile) {
    return { success: false, error: "Não foi possível carregar sua conta. Tente novamente." };
  }

  return createSubscriptionCheckout({
    name: profile.name,
    email: profile.email,
    plan: parsed.data,
    amount: expectedMonthlyPrice(parsed.data, true)!,
    userId: user.id,
  });
}

export interface CancelSubscriptionResult {
  success: boolean;
  error?: string;
}

/**
 * Cancela a assinatura mensal no Mercado Pago. O acesso continua até o fim do período pago;
 * o vitalício não é afetado. O webhook de cancelamento confirma o mesmo status.
 */
export async function cancelSubscription(): Promise<CancelSubscriptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Entre na sua conta para continuar." };
  }

  const subscription = (await loadSubscriptions(supabase, user.id)).find(
    (s) => s.plan !== "lifetime" && ["pending", "active", "past_due"].includes(s.status)
  );
  if (!subscription?.mercadopago_preapproval_id) {
    return { success: false, error: "Você não tem uma assinatura mensal ativa." };
  }

  try {
    await cancelMercadoPagoPreapproval(subscription.mercadopago_preapproval_id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[checkout] Erro ao cancelar assinatura no Mercado Pago: ${errorMessage}`);
    return { success: false, error: "Não foi possível cancelar agora. Tente novamente." };
  }

  // A RLS de subscriptions só deixa o usuário ler; quem grava é o service_role.
  await createAdminClient()
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscription.id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/configuracoes");
  return { success: true };
}
