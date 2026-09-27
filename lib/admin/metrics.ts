// Cálculos puros das métricas do /admin (sem acesso a banco) — testados em
// tests/unit/admin/metrics.test.ts.

const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

export const INACTIVE_AFTER_DAYS = 30;

// Fixo em vez de toLocaleDateString: o formato abreviado do ICU varia entre ambientes.
const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export interface MonthBucket {
  key: string; // "2026-09"
  label: string; // "set/26"
}

export interface MonthlyPoint {
  label: string;
  value: number;
}

/** Mês (yyyy-mm) de um instante, no fuso de São Paulo. */
export function monthKeyOf(date: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(date));
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}`;
}

/** Os últimos `count` meses até o mês de `now` (inclusive), do mais antigo ao mais recente. */
export function lastMonths(now: Date, count: number): MonthBucket[] {
  const [year, month] = monthKeyOf(now).split("-").map(Number);
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    // Dia 15 ao meio-dia UTC: longe de qualquer virada de mês em qualquer fuso.
    const date = new Date(Date.UTC(year, month - 1 - i, 15, 12));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_LABELS[date.getUTCMonth()]}/${String(date.getUTCFullYear()).slice(2)}`;
    buckets.push({ key, label });
  }
  return buckets;
}

/** Soma `valueOf(item)` por mês de `dateOf(item)`; meses fora de `months` são ignorados. */
export function sumByMonth<T>(
  items: T[],
  months: MonthBucket[],
  dateOf: (item: T) => string | null,
  valueOf: (item: T) => number = () => 1
): MonthlyPoint[] {
  const totals = new Map(months.map((m) => [m.key, 0]));
  for (const item of items) {
    const date = dateOf(item);
    if (!date) continue;
    const key = monthKeyOf(date);
    if (totals.has(key)) totals.set(key, totals.get(key)! + valueOf(item));
  }
  return months.map((m) => ({ label: m.label, value: totals.get(m.key)! }));
}

/** Taxa de conversão (0–100) por mês: pagos / criados. Mês sem checkout vale 0. */
export function conversionByMonth(created: MonthlyPoint[], paid: MonthlyPoint[]): MonthlyPoint[] {
  return created.map((point, i) => ({
    label: point.label,
    value: point.value > 0 ? Math.round((paid[i].value / point.value) * 1000) / 10 : 0,
  }));
}

export type AttentionReason = "never_logged_in" | "onboarding_pending" | "inactive";

export interface AttentionCandidate {
  id: string;
  name: string;
  email: string;
  hasActiveAccess: boolean;
  lastSignInAt: string | null;
  onboardingCompleted: boolean;
}

export interface AttentionItem {
  id: string;
  name: string;
  email: string;
  reason: AttentionReason;
  lastSignInAt: string | null;
}

/**
 * Clientes pagantes (acesso ativo) que precisam de contato. Cada cliente aparece uma vez,
 * pelo motivo mais urgente: nunca entrou > não concluiu o onboarding > sumiu há 30+ dias.
 */
export function customersNeedingAttention(
  candidates: AttentionCandidate[],
  now: Date
): AttentionItem[] {
  const inactiveBefore = now.getTime() - INACTIVE_AFTER_DAYS * DAY_MS;
  const items: AttentionItem[] = [];

  for (const c of candidates) {
    if (!c.hasActiveAccess) continue;
    let reason: AttentionReason | null = null;
    if (!c.lastSignInAt) reason = "never_logged_in";
    else if (!c.onboardingCompleted) reason = "onboarding_pending";
    else if (new Date(c.lastSignInAt).getTime() < inactiveBefore) reason = "inactive";
    if (reason) {
      items.push({ id: c.id, name: c.name, email: c.email, reason, lastSignInAt: c.lastSignInAt });
    }
  }

  const order: AttentionReason[] = ["never_logged_in", "onboarding_pending", "inactive"];
  return items.sort((a, b) => order.indexOf(a.reason) - order.indexOf(b.reason));
}
