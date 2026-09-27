"use server";

import { z } from "zod";
import { getAdminUser } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

const customerAccessSchema = z.object({
  customerId: z.string().uuid(),
  blocked: z.boolean(),
});

/**
 * Bloqueia (active → blocked) ou reativa (blocked → active) o acesso de um cliente.
 * O admin é sempre lido da sessão; o input só identifica o cliente-alvo.
 */
export async function setCustomerAccess(
  input: z.infer<typeof customerAccessSchema>
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const parsed = customerAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Cliente inválido." };
  }
  const { customerId, blocked } = parsed.data;

  if (customerId === admin.id) {
    return { success: false, error: "Você não pode alterar o acesso da própria conta." };
  }

  const supabase = createAdminClient();
  const fromStatus = blocked ? "active" : "blocked";
  const toStatus = blocked ? "blocked" : "active";

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", customerId)
    .eq("status", fromStatus)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    return {
      success: false,
      error: blocked
        ? "Este cliente não tem assinatura ativa para bloquear."
        : "Este cliente não tem assinatura bloqueada para reativar.",
    };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: toStatus })
    .eq("id", subscription.id);

  if (error) {
    return { success: false, error: "Não foi possível alterar o acesso. Tente novamente." };
  }

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: blocked ? "block_customer" : "unblock_customer",
    target_user_id: customerId,
    details: { subscription_id: subscription.id },
  });

  return { success: true };
}

const pendingCheckoutSchema = z.object({
  checkoutId: z.string().uuid(),
});

/**
 * Remove um checkout que ainda está pendente. Checkouts aprovados ou que falharam não são
 * removidos. Os dados do checkout ficam no admin_audit_log, porque se o pagamento for
 * aprovado depois da remoção o webhook não encontra o checkout e não cria o acesso.
 */
export async function deletePendingCheckout(
  input: z.infer<typeof pendingCheckoutSchema>
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const parsed = pendingCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Pagamento inválido." };
  }

  const supabase = createAdminClient();
  const { data: deleted, error } = await supabase
    .from("pending_checkouts")
    .delete()
    .eq("id", parsed.data.checkoutId)
    .eq("status", "pending")
    .select("id, name, email, mercadopago_payment_id, created_at")
    .maybeSingle();

  if (error) {
    return { success: false, error: "Não foi possível remover o pagamento. Tente novamente." };
  }
  if (!deleted) {
    return { success: false, error: "Este pagamento não está mais pendente." };
  }

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "delete_pending_checkout",
    details: deleted,
  });

  return { success: true };
}

const customerIdSchema = z.object({
  customerId: z.string().uuid(),
});

export interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  onboardingCompleted: boolean;
  productCount: number;
  saleCount: number;
  subscriptions: {
    id: string;
    status: string;
    amount: number;
    startedAt: string | null;
    createdAt: string;
    mercadopagoPaymentId: string | null;
  }[];
}

export type CustomerDetailsResult =
  | { success: true; customer: CustomerDetails }
  | { success: false; error: string };

/**
 * Dados do cliente para o modal de detalhes. Do negócio do cliente só saem contagens
 * (produtos, vendas) — nunca os registros em si.
 */
export async function getCustomerDetails(
  input: z.infer<typeof customerIdSchema>
): Promise<CustomerDetailsResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const parsed = customerIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Cliente inválido." };
  }
  const { customerId } = parsed.data;

  const supabase = createAdminClient();
  const [profile, authUser, settings, subscriptions, products, sales] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .eq("id", customerId)
      .eq("role", "user")
      .maybeSingle(),
    supabase.auth.admin.getUserById(customerId),
    supabase
      .from("settings")
      .select("onboarding_completed")
      .eq("user_id", customerId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, status, amount, started_at, created_at, mercadopago_payment_id")
      .eq("user_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", customerId),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("user_id", customerId),
  ]);

  if (!profile.data) {
    return { success: false, error: "Cliente não encontrado." };
  }

  const user = authUser.data.user;
  return {
    success: true,
    customer: {
      id: profile.data.id,
      name: profile.data.name,
      email: profile.data.email,
      createdAt: profile.data.created_at,
      lastSignInAt: user?.last_sign_in_at ?? null,
      emailConfirmed: Boolean(user?.email_confirmed_at),
      onboardingCompleted: Boolean(settings.data?.onboarding_completed),
      productCount: products.count ?? 0,
      saleCount: sales.count ?? 0,
      subscriptions: (subscriptions.data ?? []).map((sub) => ({
        id: sub.id,
        status: sub.status,
        amount: Number(sub.amount),
        startedAt: sub.started_at,
        createdAt: sub.created_at,
        mercadopagoPaymentId: sub.mercadopago_payment_id,
      })),
    },
  };
}

/**
 * Libera acesso sem pagamento pelo Mercado Pago (cortesia, pagamento recebido por fora,
 * checkout removido que acabou sendo pago). Cria uma assinatura ativa com valor 0.
 */
export async function grantManualAccess(
  input: z.infer<typeof customerIdSchema>
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const parsed = customerIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Cliente inválido." };
  }
  const { customerId } = parsed.data;

  if (customerId === admin.id) {
    return { success: false, error: "Você não pode alterar o acesso da própria conta." };
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", customerId)
    .eq("role", "user")
    .maybeSingle();
  if (!profile) {
    return { success: false, error: "Cliente não encontrado." };
  }

  const { data: current } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", customerId)
    .in("status", ["active", "blocked"])
    .limit(1)
    .maybeSingle();

  if (current?.status === "active") {
    return { success: false, error: "Este cliente já tem acesso ativo." };
  }
  if (current?.status === "blocked") {
    return { success: false, error: "Este cliente está bloqueado. Use \"Reativar acesso\"." };
  }

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: customerId,
      status: "active",
      amount: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation — já existe uma assinatura ativa (clique duplo, webhook)
    if (error.code === "23505") {
      return { success: false, error: "Este cliente já tem acesso ativo." };
    }
    return { success: false, error: "Não foi possível liberar o acesso. Tente novamente." };
  }

  // O onboarding exige uma linha em settings; contas que nunca pagaram podem não ter.
  await supabase
    .from("settings")
    .upsert({ user_id: customerId }, { onConflict: "user_id", ignoreDuplicates: true });

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "grant_manual_access",
    target_user_id: customerId,
    details: { subscription_id: subscription.id },
  });

  return { success: true };
}

/**
 * Reenvia o e-mail de acesso: convite para quem nunca confirmou o e-mail, link de
 * redefinição de senha para quem já confirmou.
 */
export async function resendAccessLink(
  input: z.infer<typeof customerIdSchema>
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const parsed = customerIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Cliente inválido." };
  }
  const { customerId } = parsed.data;

  const supabase = createAdminClient();
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, email")
      .eq("id", customerId)
      .eq("role", "user")
      .maybeSingle(),
    supabase.auth.admin.getUserById(customerId),
  ]);

  if (!profile || !authUser.user) {
    return { success: false, error: "Cliente não encontrado." };
  }

  // Mesmos parâmetros dos fluxos existentes: a redefinição igual à tela "esqueci a senha",
  // o convite igual ao do webhook (lib/mercadopago/process-payment.ts).
  const confirmed = Boolean(authUser.user.email_confirmed_at);
  const { error } = confirmed
    ? await supabase.auth.resetPasswordForEmail(profile.email)
    : await supabase.auth.admin.inviteUserByEmail(profile.email, {
        data: { name: profile.name },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      });

  if (error) {
    return {
      success: false,
      error: "Não foi possível enviar o e-mail. Aguarde alguns minutos e tente novamente.",
    };
  }

  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "resend_access_link",
    target_user_id: customerId,
    details: { type: confirmed ? "password_reset" : "invite" },
  });

  return { success: true };
}
