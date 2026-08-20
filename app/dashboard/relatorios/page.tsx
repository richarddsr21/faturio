import { createClient } from "@/lib/supabase/server";
import { reportMonthsSchema } from "@/lib/validations/relatorios";
import {
  buildMonthRange,
  aggregateMonthlyMetrics,
  rankTopProducts,
  parseMonthKey,
  type SaleRecord,
  type SaleItemRecord,
} from "@/lib/relatorios/monthly-report";
import ReportView from "@/components/relatorios/report-view";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const { months: monthsParam } = await searchParams;
  const monthsCount = reportMonthsSchema.parse(monthsParam);

  const monthKeys = buildMonthRange(monthsCount, new Date());
  const first = parseMonthKey(monthKeys[0]);
  const last = parseMonthKey(monthKeys[monthKeys.length - 1]);
  const startDate = new Date(first.year, first.monthIndex, 1).toISOString();
  const endDate = new Date(last.year, last.monthIndex + 1, 1).toISOString();

  const supabase = await createClient();
  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, sale_date, gross_revenue, net_profit, sale_items(product_id, quantity, subtotal)")
      .gte("sale_date", startDate)
      .lt("sale_date", endDate)
      .order("sale_date", { ascending: true }),
    supabase.from("products").select("id, name"),
  ]);

  const salesList = sales ?? [];
  const productNames = new Map((products ?? []).map((p) => [p.id, p.name]));

  const saleRecords: SaleRecord[] = salesList.map((s) => ({
    saleDate: s.sale_date,
    grossRevenue: Number(s.gross_revenue),
    netProfit: Number(s.net_profit),
  }));

  const saleItemRecords: SaleItemRecord[] = salesList.flatMap((s) =>
    s.sale_items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    }))
  );

  const monthlyMetrics = aggregateMonthlyMetrics(saleRecords, monthKeys);
  const topProducts = rankTopProducts(saleItemRecords, productNames);
  const periodLabel = `${monthlyMetrics[0].label} a ${monthlyMetrics[monthlyMetrics.length - 1].label}`;

  return (
    <ReportView
      periodLabel={periodLabel}
      monthsCount={monthsCount}
      months={monthlyMetrics}
      topProducts={topProducts}
    />
  );
}
