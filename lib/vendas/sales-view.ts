// Números e agrupamentos da tela de Vendas, sem I/O.
//
// Datas no fuso do servidor, como o resto do painel por enquanto (#6).

export const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

export function paymentMethodLabel(method: string): string {
  return paymentMethodLabels[method] ?? method;
}

export const salesPeriods = ["7", "30", "90", "tudo"] as const;
export type SalesPeriod = (typeof salesPeriods)[number];

export function parseSalesPeriod(value: string | undefined): SalesPeriod {
  return salesPeriods.includes(value as SalesPeriod) ? (value as SalesPeriod) : "tudo";
}

/** Início do período (meia-noite de N−1 dias atrás, contando hoje). null = desde sempre. */
export function periodStart(period: SalesPeriod, now: Date): Date | null {
  if (period === "tudo") return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (Number(period) - 1));
  return start;
}

export interface SaleSummaryRow {
  grossRevenue: number;
  netProfit: number;
  paymentMethod: string;
}

export interface PaymentShare {
  method: string;
  count: number;
  /** Fração do número de vendas (0–1). */
  share: number;
}

export interface SalesSummary {
  revenue: number;
  profit: number;
  count: number;
  /** Formas de pagamento da mais usada para a menos usada. */
  payments: PaymentShare[];
}

export function summarizeSales(rows: SaleSummaryRow[]): SalesSummary {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.paymentMethod, (counts.get(row.paymentMethod) ?? 0) + 1);
  const payments = [...counts.entries()]
    .map(([method, count]) => ({ method, count, share: count / rows.length }))
    .sort((a, b) => b.count - a.count || a.method.localeCompare(b.method));
  return {
    revenue: rows.reduce((sum, r) => sum + r.grossRevenue, 0),
    profit: rows.reduce((sum, r) => sum + r.netProfit, 0),
    count: rows.length,
    payments,
  };
}

/** Margem da venda sobre o faturamento; null se a venda saiu de graça. */
export function saleMargin(grossRevenue: number, netProfit: number): number | null {
  return grossRevenue > 0 ? netProfit / grossRevenue : null;
}

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface MonthGroup<T> {
  key: string;
  /** Ex.: "setembro 2026". */
  label: string;
  items: T[];
}

/** Agrupa por mês mantendo a ordem de entrada (a lista já vem da mais recente). */
export function groupByMonth<T extends { saleDate: string }>(sales: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const sale of sales) {
    const date = new Date(sale.saleDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(sale);
    else groups.push({ key, label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`, items: [sale] });
  }
  return groups;
}
