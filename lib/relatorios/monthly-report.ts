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

export function aggregateMonthlyMetrics(sales: SaleRecord[], monthKeys: string[]): MonthlyMetric[] {
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

  for (const key of monthKeys) {
    const bucket = buckets.get(key)!;
    const margin = bucket.revenue > 0 ? bucket.profit / bucket.revenue : 0;
    metrics.push({
      month: key,
      label: formatMonthLabel(key),
      revenue: bucket.revenue,
      salesCount: bucket.salesCount,
      profit: bucket.profit,
      margin,
      revenueChangePercent: previous ? changePercent(bucket.revenue, previous.revenue) : null,
      profitChangePercent: previous ? changePercent(bucket.profit, previous.profit) : null,
    });
    previous = { revenue: bucket.revenue, profit: bucket.profit };
  }

  return metrics;
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
