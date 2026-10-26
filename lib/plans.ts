// Planos, preços e recursos por plano (#11). Sem I/O: usado no proxy, nas Server Actions,
// no webhook e nas telas.
//
// lifetime  vitalício (R$ 129,90 pago uma vez, não é mais vendido): recursos do basic, sem
//           expiração. Pode assinar Pro ou IA com preço especial.
// basic     Essencial  R$ 29,90/mês
// pro       Pro        R$ 59,90/mês
// premium   IA         R$ 109,90/mês

export const PLANS = ["lifetime", "basic", "pro", "premium"] as const;
export type Plan = (typeof PLANS)[number];

/** Planos vendidos como assinatura mensal. */
export const RECURRING_PLANS = ["basic", "pro", "premium"] as const;
export type RecurringPlan = (typeof RECURRING_PLANS)[number];

/** Planos que um vitalício pode assinar (o basic ele já tem). */
export const LIFETIME_UPGRADE_PLANS = ["pro", "premium"] as const;
export type LifetimeUpgradePlan = (typeof LIFETIME_UPGRADE_PLANS)[number];

export const PLAN_NAMES: Record<Plan, string> = {
  lifetime: "Vitalício",
  basic: "Essencial",
  pro: "Pro",
  premium: "IA",
};

/** Preço mensal para quem assina sem ser vitalício. */
export const MONTHLY_PRICES: Record<RecurringPlan, number> = {
  basic: 29.9,
  pro: 59.9,
  premium: 109.9,
};

/** Preço mensal do upgrade para quem já é vitalício. */
export const LIFETIME_UPGRADE_PRICES: Record<LifetimeUpgradePlan, number> = {
  pro: 29.9,
  premium: 79.9,
};

/** Nível de cada plano: o vitalício vale o mesmo que o basic. */
const PLAN_RANK: Record<Plan, number> = {
  lifetime: 1,
  basic: 1,
  pro: 2,
  premium: 3,
};

/**
 * Plano mínimo de cada recurso. Por enquanto todos os recursos que existem são do basic;
 * os do Pro e da IA entram aqui junto com cada issue.
 */
export const FEATURE_PLANS = {
  products: "basic",
  pricing_calculator: "basic",
  product_costs: "basic",
  stock: "basic",
  sales: "basic",
  sale_breakdown: "basic",
  sales_channels: "basic",
  channel_pricing: "basic",
  goals: "basic",
  overview: "basic",
  reports: "basic",
  spreadsheet_import: "basic",
  export: "basic",
} as const satisfies Record<string, RecurringPlan>;

export type Feature = keyof typeof FEATURE_PLANS;

export function isRecurringPlan(value: unknown): value is RecurringPlan {
  return typeof value === "string" && (RECURRING_PLANS as readonly string[]).includes(value);
}

export function isLifetimeUpgradePlan(value: unknown): value is LifetimeUpgradePlan {
  return typeof value === "string" && (LIFETIME_UPGRADE_PLANS as readonly string[]).includes(value);
}

/** Sem plano (sem acesso), nenhum recurso. */
export function hasFeature(plan: Plan | null, feature: Feature): boolean {
  if (!plan) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_PLANS[feature]];
}

/**
 * Preço mensal esperado de uma assinatura: o de upgrade quando quem assina já é vitalício.
 * null quando a combinação não existe (vitalício assinando basic).
 */
export function expectedMonthlyPrice(plan: RecurringPlan, isLifetimeUpgrade: boolean): number | null {
  if (!isLifetimeUpgrade) return MONTHLY_PRICES[plan];
  return isLifetimeUpgradePlan(plan) ? LIFETIME_UPGRADE_PRICES[plan] : null;
}

/** Compara valores em reais sem cair em erro de ponto flutuante. */
export function sameAmount(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export interface SubscriptionAccessRow {
  plan: Plan;
  status: string;
  current_period_end: string | null;
}

/**
 * Se a assinatura dá acesso agora.
 * - Vitalícia: enquanto estiver active (bloqueada pelo admin não dá).
 * - Mensal: active, past_due (cobrança falhou e o Mercado Pago ainda tenta) ou cancelled,
 *   sempre até o fim do período pago. Pending (autorizada, sem pagamento) não dá.
 */
export function grantsAccess(subscription: SubscriptionAccessRow, now: Date): boolean {
  if (subscription.plan === "lifetime") return subscription.status === "active";
  if (!["active", "past_due", "cancelled"].includes(subscription.status)) return false;
  if (!subscription.current_period_end) return false;
  return new Date(subscription.current_period_end).getTime() > now.getTime();
}

/** O maior plano entre as assinaturas que dão acesso agora; null = sem acesso. */
export function effectivePlan(subscriptions: SubscriptionAccessRow[], now: Date): Plan | null {
  let best: Plan | null = null;
  for (const subscription of subscriptions) {
    if (!grantsAccess(subscription, now)) continue;
    if (!best || PLAN_RANK[subscription.plan] > PLAN_RANK[best]) best = subscription.plan;
  }
  return best;
}

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
