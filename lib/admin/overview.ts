import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  conversionByMonth,
  customersNeedingAttention,
  lastMonths,
  sumByMonth,
  type AttentionItem,
  type MonthlyPoint,
} from "@/lib/admin/metrics";

const CHART_MONTHS = 12;

export interface AdminOverview {
  customerCount: number;
  activeCount: number;
  blockedCount: number;
  totalRevenue: number;
  pendingCheckoutCount: number;
  conversionRate: number | null; // % nos últimos 12 meses; null sem checkouts
  paidCheckouts: number;
  createdCheckouts: number;
  revenueByMonth: MonthlyPoint[];
  newCustomersByMonth: MonthlyPoint[];
  conversionByMonth: MonthlyPoint[];
  attention: AttentionItem[];
}

/** Último login de cada usuário do Auth (paginado — a API devolve no máximo 1000 por página). */
async function lastSignInByUser(supabase: ReturnType<typeof createAdminClient>) {
  const result = new Map<string, string | null>();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) result.set(user.id, user.last_sign_in_at ?? null);
    if (data.users.length < perPage) break;
  }
  return result;
}

/** Só chamar depois de requireAdmin(): lê dados de todos os tenants via service_role. */
export async function getAdminOverview(now: Date = new Date()): Promise<AdminOverview> {
  const supabase = createAdminClient();

  const [profiles, subscriptions, checkouts, settings, lastSignIn] = await Promise.all([
    supabase.from("profiles").select("id, name, email, created_at").eq("role", "user"),
    supabase.from("subscriptions").select("user_id, status, amount, started_at"),
    supabase.from("pending_checkouts").select("status, created_at"),
    supabase.from("settings").select("user_id, onboarding_completed"),
    lastSignInByUser(supabase),
  ]);

  const customers = profiles.data ?? [];
  const subs = subscriptions.data ?? [];
  const allCheckouts = checkouts.data ?? [];
  const months = lastMonths(now, CHART_MONTHS);

  // Toda assinatura com started_at foi paga ou liberada (manual tem valor 0).
  const startedSubs = subs.filter((s) => s.started_at !== null);
  const createdByMonth = sumByMonth(allCheckouts, months, (c) => c.created_at);
  const paidByMonth = sumByMonth(
    allCheckouts.filter((c) => c.status === "completed"),
    months,
    (c) => c.created_at
  );
  const createdCheckouts = createdByMonth.reduce((sum, p) => sum + p.value, 0);
  const paidCheckouts = paidByMonth.reduce((sum, p) => sum + p.value, 0);

  const activeUsers = new Set(subs.filter((s) => s.status === "active").map((s) => s.user_id));
  const onboardingByUser = new Map(
    (settings.data ?? []).map((s) => [s.user_id, Boolean(s.onboarding_completed)])
  );

  return {
    customerCount: customers.length,
    activeCount: activeUsers.size,
    blockedCount: subs.filter((s) => s.status === "blocked").length,
    totalRevenue: startedSubs.reduce((sum, s) => sum + Number(s.amount), 0),
    pendingCheckoutCount: allCheckouts.filter((c) => c.status === "pending").length,
    conversionRate:
      createdCheckouts > 0 ? Math.round((paidCheckouts / createdCheckouts) * 1000) / 10 : null,
    paidCheckouts,
    createdCheckouts,
    revenueByMonth: sumByMonth(
      startedSubs,
      months,
      (s) => s.started_at,
      (s) => Number(s.amount)
    ),
    newCustomersByMonth: sumByMonth(customers, months, (c) => c.created_at),
    conversionByMonth: conversionByMonth(createdByMonth, paidByMonth),
    attention: customersNeedingAttention(
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        hasActiveAccess: activeUsers.has(c.id),
        lastSignInAt: lastSignIn.get(c.id) ?? null,
        onboardingCompleted: onboardingByUser.get(c.id) ?? false,
      })),
      now
    ),
  };
}
