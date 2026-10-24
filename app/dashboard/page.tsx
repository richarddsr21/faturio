import { createClient } from "@/lib/supabase/server";
import { Overview } from "@/components/dashboard/overview";
import { calculateStockPotential } from "@/lib/finance/stock-potential";
import { calculateMonthProjection } from "@/lib/finance/projection";
import {
  comparisonRange,
  cumulativeRevenue,
  daysInMonth,
  goalStatus,
  isSameMonth,
  monthNames,
  monthRange,
  mostCriticalStock,
  overviewHeadline,
  parseMonthParam,
  shiftMonth,
  summarizeSales,
  topProduct,
  type OverviewSale,
} from "@/lib/dashboard/overview";

interface SaleRow {
  sale_date: string;
  gross_revenue: number | string;
  net_profit: number | string;
  sale_items: {
    product_id: string;
    quantity: number;
    subtotal: number | string;
    products: { name: string } | null;
  }[];
}

const SALE_COLUMNS =
  "sale_date, gross_revenue, net_profit, sale_items(product_id, quantity, subtotal, products(name))";

function toOverviewSale(row: SaleRow): OverviewSale {
  return {
    saleDate: row.sale_date,
    grossRevenue: Number(row.gross_revenue),
    netProfit: Number(row.net_profit),
    items: row.sale_items.map((item) => ({
      productId: item.product_id,
      productName: item.products?.name ?? "Produto removido",
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[] }>;
}) {
  const { mes } = await searchParams;
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const selected = parseMonthParam(Array.isArray(mes) ? mes[0] : mes, now);
  const isCurrentMonth = isSameMonth(selected, current);
  const range = monthRange(selected);
  const comparison = comparisonRange(selected, now);

  // Client da sessão: RLS restringe cada tabela às linhas do próprio usuário.
  const supabase = await createClient();
  const [goalResult, salesResult, previousResult, recentResult, productsResult] = await Promise.all([
    supabase
      .from("goals")
      .select("revenue_goal")
      .eq("month", selected.month)
      .eq("year", selected.year)
      .maybeSingle(),
    supabase
      .from("sales")
      .select(SALE_COLUMNS)
      .gte("sale_date", range.start.toISOString())
      .lt("sale_date", range.end.toISOString())
      .order("sale_date", { ascending: true }),
    supabase
      .from("sales")
      .select(SALE_COLUMNS)
      .gte("sale_date", comparison.start.toISOString())
      .lt("sale_date", comparison.end.toISOString()),
    supabase
      .from("sales")
      .select("id, sale_date, payment_method, gross_revenue, net_profit, customer_name")
      .lt("sale_date", range.end.toISOString())
      .order("sale_date", { ascending: false })
      .limit(3),
    supabase
      .from("products")
      .select("id, name, stock_quantity, minimum_stock, current_price")
      .eq("status", "active"),
  ]);

  const sales = ((salesResult.data ?? []) as unknown as SaleRow[]).map(toOverviewSale);
  const previousSales = ((previousResult.data ?? []) as unknown as SaleRow[]).map(toOverviewSale);
  const products = productsResult.data ?? [];

  const totals = summarizeSales(sales);
  const goal = goalStatus(goalResult.data ? Number(goalResult.data.revenue_goal) : null, totals.revenue);
  const projection = isCurrentMonth
    ? calculateMonthProjection(totals.revenue, now.getDate(), daysInMonth(selected))
    : totals.revenue;

  return (
    <Overview
      headline={overviewHeadline({ goal, salesCount: totals.salesCount, isCurrentMonth, projection })}
      selected={selected}
      current={current}
      monthName={monthNames[selected.month - 1]}
      previousName={monthNames[shiftMonth(selected, -1).month - 1]}
      comparisonCutDay={comparison.partial ? now.getDate() : null}
      totals={totals}
      previousTotals={summarizeSales(previousSales)}
      goal={goal}
      champion={topProduct(sales)}
      distinctProducts={new Set(sales.flatMap((s) => s.items.map((i) => i.productId))).size}
      series={cumulativeRevenue(sales, selected, now)}
      recentSales={(recentResult.data ?? []).map((s) => ({
        id: s.id,
        saleDate: s.sale_date,
        paymentMethod: s.payment_method,
        grossRevenue: Number(s.gross_revenue),
        netProfit: Number(s.net_profit),
        customerName: s.customer_name,
      }))}
      stockUnits={products.reduce((sum, p) => sum + p.stock_quantity, 0)}
      stockPotential={calculateStockPotential(
        products.map((p) => ({ stockQuantity: p.stock_quantity, currentPrice: Number(p.current_price ?? 0) }))
      )}
      critical={mostCriticalStock(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          stockQuantity: p.stock_quantity,
          minimumStock: p.minimum_stock,
        }))
      )}
      hasProducts={products.length > 0}
    />
  );
}
