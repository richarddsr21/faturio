import { isLowStock } from "@/lib/finance/stock";
import { daysInMonth as calendarDaysInMonth, zonedMidnight, zonedParts } from "@/lib/dates";

// Cálculos da Visão geral, sem I/O: a página busca os dados e estas funções montam
// o que cada card mostra. Dia e mês sempre no horário de Brasília (lib/dates).

export const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface YearMonth {
  year: number;
  /** 1–12 */
  month: number;
}

export interface OverviewSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  subtotal: number;
}

export interface OverviewSale {
  saleDate: string;
  grossRevenue: number;
  netProfit: number;
  items: OverviewSaleItem[];
}

export interface OverviewProduct {
  id: string;
  name: string;
  stockQuantity: number;
  minimumStock: number;
}

/** Mês de `now` no horário de Brasília. */
export function yearMonthOf(now: Date): YearMonth {
  const { year, month } = zonedParts(now);
  return { year, month };
}

/** Lê `?mes=AAAA-MM`. Inválido ou no futuro volta para o mês atual. */
export function parseMonthParam(param: string | undefined, now: Date): YearMonth {
  const current = yearMonthOf(now);
  const match = param?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return current;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000) return current;
  if (year * 12 + month > current.year * 12 + current.month) return current;
  return { year, month };
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isSameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function daysInMonth({ year, month }: YearMonth): number {
  return calendarDaysInMonth(year, month);
}

/** Intervalo [start, end) do mês inteiro, de meia-noite a meia-noite em Brasília. */
export function monthRange(ym: YearMonth): { start: Date; end: Date } {
  return { start: zonedMidnight(ym.year, ym.month, 1), end: zonedMidnight(ym.year, ym.month + 1, 1) };
}

/**
 * Intervalo do mês anterior usado na comparação. Se o mês escolhido é o atual (ainda
 * em andamento), corta o anterior no mesmo dia, para não comparar meio mês com um
 * mês fechado (1–19/out contra 1–19/set).
 */
export function comparisonRange(
  ym: YearMonth,
  now: Date
): { start: Date; end: Date; partial: boolean } {
  const previousMonth = shiftMonth(ym, -1);
  const previous = monthRange(previousMonth);
  if (!isSameMonth(ym, yearMonthOf(now))) return { ...previous, partial: false };
  const cut = zonedMidnight(previousMonth.year, previousMonth.month, zonedParts(now).day + 1);
  if (cut >= previous.end) return { ...previous, partial: false };
  return { start: previous.start, end: cut, partial: true };
}

export interface MonthTotals {
  revenue: number;
  profit: number;
  salesCount: number;
  pieces: number;
  /** Lucro ÷ faturamento (0–1). */
  margin: number;
  averageTicket: number;
}

export function summarizeSales(sales: OverviewSale[]): MonthTotals {
  const revenue = sales.reduce((sum, s) => sum + s.grossRevenue, 0);
  const profit = sales.reduce((sum, s) => sum + s.netProfit, 0);
  const pieces = sales.reduce(
    (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  return {
    revenue,
    profit,
    salesCount: sales.length,
    pieces,
    margin: revenue > 0 ? profit / revenue : 0,
    averageTicket: sales.length > 0 ? revenue / sales.length : 0,
  };
}

/** Variação relativa (0,1 = +10%). null quando não há base para comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export type GoalStatus =
  | { kind: "none" }
  | { kind: "hit"; goal: number; percent: number; excess: number; goalShare: number }
  | { kind: "progress"; goal: number; percent: number; remaining: number };

/**
 * Estado da meta do mês. Batida: `goalShare` é a fração da barra que corresponde à
 * meta (o resto, hachurado, é o que passou dela).
 */
export function goalStatus(goal: number | null, revenue: number): GoalStatus {
  if (!goal || goal <= 0) return { kind: "none" };
  const percent = revenue / goal;
  if (revenue >= goal) {
    return { kind: "hit", goal, percent, excess: revenue - goal, goalShare: goal / revenue };
  }
  return { kind: "progress", goal, percent, remaining: goal - revenue };
}

export interface CumulativePoint {
  day: number;
  /** Faturamento acumulado até o fim do dia; null nos dias que ainda não chegaram. */
  cumulative: number | null;
  dayRevenue: number;
}

/** Faturamento acumulado dia a dia. No mês atual, para no dia de hoje. */
export function cumulativeRevenue(sales: OverviewSale[], ym: YearMonth, now: Date): CumulativePoint[] {
  const totalDays = daysInMonth(ym);
  const lastDay = isSameMonth(ym, yearMonthOf(now)) ? zonedParts(now).day : totalDays;

  const byDay = new Array<number>(totalDays + 1).fill(0);
  for (const sale of sales) {
    byDay[zonedParts(sale.saleDate).day] += sale.grossRevenue;
  }

  let running = 0;
  const points: CumulativePoint[] = [];
  for (let day = 1; day <= totalDays; day++) {
    running += byDay[day];
    points.push({ day, cumulative: day <= lastDay ? running : null, dayRevenue: byDay[day] });
  }
  return points;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  /** Fração do faturamento do mês (0–1). */
  share: number;
}

/** Produto que mais faturou no mês (empate: mais unidades). */
export function topProduct(sales: OverviewSale[]): TopProduct | null {
  const byProduct = new Map<string, TopProduct>();
  let total = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const entry = byProduct.get(item.productId) ?? {
        name: item.productName,
        quantity: 0,
        revenue: 0,
        share: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += item.subtotal;
      byProduct.set(item.productId, entry);
      total += item.subtotal;
    }
  }
  let best: TopProduct | null = null;
  for (const entry of byProduct.values()) {
    if (!best || entry.revenue > best.revenue || (entry.revenue === best.revenue && entry.quantity > best.quantity)) {
      best = entry;
    }
  }
  return best ? { ...best, share: total > 0 ? best.revenue / total : 0 } : null;
}

/** Produto mais perto de acabar entre os que estão com estoque baixo. */
export function mostCriticalStock(products: OverviewProduct[]): OverviewProduct | null {
  const low = products.filter((p) => isLowStock(p.stockQuantity, p.minimumStock));
  low.sort(
    (a, b) => a.stockQuantity / a.minimumStock - b.stockQuantity / b.minimumStock || a.stockQuantity - b.stockQuantity
  );
  return low[0] ?? null;
}

export function overviewHeadline(input: {
  goal: GoalStatus;
  salesCount: number;
  isCurrentMonth: boolean;
  /** Projeção de faturamento para o mês inteiro (só faz sentido no mês atual). */
  projection: number;
}): string {
  const { goal, salesCount, isCurrentMonth, projection } = input;
  if (goal.kind === "hit") return "Seu mês foi forte. Bora pra próxima meta.";
  if (salesCount === 0) {
    return isCurrentMonth ? "Mês novo, página em branco. Bora vender." : "Nenhuma venda neste mês.";
  }
  if (goal.kind === "none") return "Defina uma meta e acompanhe o mês.";
  if (!isCurrentMonth) return "Esse mês ficou abaixo da meta.";
  return projection >= goal.goal
    ? "No ritmo certo para bater a meta."
    : "Ainda dá tempo de bater a meta.";
}
