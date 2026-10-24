const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export interface SaleRecord {
  saleDate: string;
  grossRevenue: number;
  netProfit: number;
}

export interface SaleItemRecord {
  productId: string;
  quantity: number;
  subtotal: number;
}

export interface MonthlyMetric {
  month: string;
  label: string;
  revenue: number;
  salesCount: number;
  profit: number;
  margin: number;
  revenueChangePercent: number | null;
  profitChangePercent: number | null;
  /**
   * Mês ainda em andamento: as variações comparam com o mesmo intervalo de dias do
   * mês anterior (1–19/out contra 1–19/set), não com o mês anterior inteiro.
   */
  partial: boolean;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export function formatMonthLabel(monthKey: string): string {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return `${MONTH_ABBREVIATIONS[monthIndex]}/${year}`;
}

export function buildMonthRange(monthsCount: number, referenceDate: Date): string[] {
  const keys: string[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return (current - previous) / previous;
}

/**
 * Métricas por mês. Com `now`, o mês corrente (se estiver na lista) fica marcado como
 * parcial e é comparado só com os mesmos primeiros dias do mês anterior.
 */
export function aggregateMonthlyMetrics(
  sales: SaleRecord[],
  monthKeys: string[],
  now?: Date
): MonthlyMetric[] {
  const currentKey = now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` : null;
  const buckets = new Map<string, { revenue: number; salesCount: number; profit: number }>();
  for (const key of monthKeys) {
    buckets.set(key, { revenue: 0, salesCount: 0, profit: 0 });
  }

  for (const sale of sales) {
    const monthKey = sale.saleDate.slice(0, 7);
    const bucket = buckets.get(monthKey);
    if (!bucket) continue;
    bucket.revenue += sale.grossRevenue;
    bucket.salesCount += 1;
    bucket.profit += sale.netProfit;
  }

  const metrics: MonthlyMetric[] = [];
  let previous: { revenue: number; profit: number } | null = null;

  for (const [index, key] of monthKeys.entries()) {
    const bucket = buckets.get(key)!;
    const partial = key === currentKey;
    // Mês corrente: em vez do mês anterior inteiro, só os mesmos primeiros dias dele.
    const base =
      partial && previous && index > 0 && now
        ? totalsUntilDay(sales, monthKeys[index - 1], now.getDate())
        : previous;
    const margin = bucket.revenue > 0 ? bucket.profit / bucket.revenue : 0;
    metrics.push({
      month: key,
      label: formatMonthLabel(key),
      revenue: bucket.revenue,
      salesCount: bucket.salesCount,
      profit: bucket.profit,
      margin,
      revenueChangePercent: base ? changePercent(bucket.revenue, base.revenue) : null,
      profitChangePercent: base ? changePercent(bucket.profit, base.profit) : null,
      partial,
    });
    previous = { revenue: bucket.revenue, profit: bucket.profit };
  }

  return metrics;
}

function totalsUntilDay(sales: SaleRecord[], monthKey: string, lastDay: number) {
  let revenue = 0;
  let profit = 0;
  for (const sale of sales) {
    if (sale.saleDate.slice(0, 7) !== monthKey || Number(sale.saleDate.slice(8, 10)) > lastDay) continue;
    revenue += sale.grossRevenue;
    profit += sale.netProfit;
  }
  return { revenue, profit };
}

export function rankTopProducts(
  items: SaleItemRecord[],
  productNames: Map<string, string>,
  limit = 5
): TopProduct[] {
  const totals = new Map<string, { quantity: number; revenue: number }>();

  for (const item of items) {
    const entry = totals.get(item.productId) ?? { quantity: 0, revenue: 0 };
    entry.quantity += item.quantity;
    entry.revenue += item.subtotal;
    totals.set(item.productId, entry);
  }

  return Array.from(totals.entries())
    .map(([productId, entry]) => ({
      productId,
      name: productNames.get(productId) ?? "Produto removido",
      quantity: entry.quantity,
      revenue: entry.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
}
