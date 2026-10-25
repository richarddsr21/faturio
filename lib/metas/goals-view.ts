// Histórico de metas (tela de Metas), sem I/O. Mês de cada venda no horário de Brasília.

import { monthKeyOf, zonedParts } from "@/lib/dates";

export const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface GoalRow {
  month: number;
  year: number;
  revenueGoal: number;
  /** Fração (0,37 = 37%); null se não definida. */
  desiredMargin: number | null;
}

export interface SaleRow {
  saleDate: string;
  grossRevenue: number;
  netProfit: number;
}

export type GoalState = "hit" | "missed" | "in_progress" | "planned";

export interface GoalHistoryItem extends GoalRow {
  key: string;
  revenue: number;
  profit: number;
  /** Realizado ÷ meta (pode passar de 1). */
  percent: number;
  /** Lucro ÷ faturamento; null sem vendas. */
  realMargin: number | null;
  state: GoalState;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Faturamento e lucro por mês ("AAAA-MM"). */
export function totalsByMonth(sales: SaleRow[]): Map<string, { revenue: number; profit: number }> {
  const totals = new Map<string, { revenue: number; profit: number }>();
  for (const sale of sales) {
    const key = monthKeyOf(sale.saleDate);
    const entry = totals.get(key) ?? { revenue: 0, profit: 0 };
    entry.revenue += sale.grossRevenue;
    entry.profit += sale.netProfit;
    totals.set(key, entry);
  }
  return totals;
}

/**
 * Histórico do mais recente para o mais antigo. Mês atual ainda não batido fica
 * "em andamento" (não "não batida"); meses futuros ficam "planejada".
 */
export function goalHistory(goals: GoalRow[], sales: SaleRow[], now: Date): GoalHistoryItem[] {
  const totals = totalsByMonth(sales);
  const today = zonedParts(now);
  const currentIndex = today.year * 12 + (today.month - 1);

  return goals
    .map((goal) => {
      const key = monthKey(goal.year, goal.month);
      const { revenue, profit } = totals.get(key) ?? { revenue: 0, profit: 0 };
      const percent = goal.revenueGoal > 0 ? revenue / goal.revenueGoal : 0;
      const index = goal.year * 12 + (goal.month - 1);
      let state: GoalState;
      if (index > currentIndex) state = "planned";
      else if (goal.revenueGoal > 0 && revenue >= goal.revenueGoal) state = "hit";
      else if (index === currentIndex) state = "in_progress";
      else state = "missed";
      return { ...goal, key, revenue, profit, percent, realMargin: revenue > 0 ? profit / revenue : null, state };
    })
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));
}

/** Resultado do mês anterior ao atual, para o selo do formulário. */
export function previousMonthResult(history: GoalHistoryItem[], now: Date): GoalHistoryItem | null {
  const { year, month } = zonedParts(now);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return history.find((item) => item.year === previous.year && item.month === previous.month) ?? null;
}
