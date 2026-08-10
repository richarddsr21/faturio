import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { calculateGoalProgress } from "@/lib/finance/goals";
import { calculateStockPotential } from "@/lib/finance/stock-potential";
import { calculateAverageTicket, calculateMonthProjection } from "@/lib/finance/projection";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(year, now.getMonth() + 1, 1).toISOString();

  const [{ data: goal }, { data: sales }, { data: products }] = await Promise.all([
    supabase.from("goals").select("revenue_goal").eq("month", month).eq("year", year).maybeSingle(),
    supabase
      .from("sales")
      .select("id, sale_date, gross_revenue, net_profit, sale_items(quantity)")
      .gte("sale_date", startOfMonth)
      .lt("sale_date", startOfNextMonth)
      .order("sale_date", { ascending: true }),
    supabase
      .from("products")
      .select("stock_quantity, minimum_stock, current_price")
      .eq("status", "active"),
  ]);

  const salesList = sales ?? [];
  const productsList = products ?? [];

  const totalRevenue = salesList.reduce((sum, sale) => sum + Number(sale.gross_revenue), 0);
  const totalProfit = salesList.reduce((sum, sale) => sum + Number(sale.net_profit), 0);
  const totalPiecesSold = salesList.reduce(
    (sum, sale) =>
      sum + sale.sale_items.reduce((itemSum: number, item: { quantity: number }) => itemSum + item.quantity, 0),
    0
  );
  const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const averageTicket = calculateAverageTicket(totalRevenue, salesList.length);

  const goalProgress = calculateGoalProgress({
    goal: goal?.revenue_goal ?? 0,
    currentRevenue: totalRevenue,
    averageTicket,
  });

  const stockPotential = calculateStockPotential(
    productsList.map((p) => ({
      stockQuantity: p.stock_quantity,
      currentPrice: Number(p.current_price ?? 0),
    }))
  );
  const totalStockUnits = productsList.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockCount = productsList.filter((p) => p.stock_quantity < p.minimum_stock).length;

  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthProjection = calculateMonthProjection(totalRevenue, now.getDate(), daysInMonth);

  const revenueByDay = new Map<string, number>();
  for (const sale of salesList) {
    const day = String(sale.sale_date).slice(0, 10);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + Number(sale.gross_revenue));
  }
  const chartData = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({ date, revenue }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão geral</h1>
        <p className="text-muted-foreground">Bem-vindo, {user?.email}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(goal?.revenue_goal ?? 0)}
            </p>
            <div className="mt-3">
              <Progress value={goalProgress.progressPercentage * 100} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {(goalProgress.progressPercentage * 100).toFixed(1)}% — falta{" "}
                {formatCurrency(goalProgress.remaining)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalProfit)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{(margin * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Peças vendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalPiecesSold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(averageTicket)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalStockUnits} un.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(stockPotential)} em potencial
              {lowStockCount > 0 && ` · ${lowStockCount} produto(s) com estoque baixo`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Falta para a meta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(goalProgress.remaining)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ~{goalProgress.estimatedSalesNeeded} vendas para bater a meta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Projeção mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(monthProjection)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento no mês</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada neste mês ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
