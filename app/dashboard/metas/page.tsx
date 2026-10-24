import { createClient } from "@/lib/supabase/server";
import { GoalsScreen } from "@/components/metas/goals-screen";
import { goalHistory, previousMonthResult } from "@/lib/metas/goals-view";

// O PostgREST devolve no máximo 1000 linhas por requisição; as vendas são lidas em blocos.
const SALES_CHUNK = 1000;

export default async function MetasPage() {
  // Client da sessão: RLS restringe goals e sales às linhas do próprio usuário.
  const supabase = await createClient();
  const { data: goalsData } = await supabase
    .from("goals")
    .select("month, year, revenue_goal, desired_margin")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  const goals = (goalsData ?? []).map((g) => ({
    month: g.month,
    year: g.year,
    revenueGoal: Number(g.revenue_goal),
    desiredMargin: g.desired_margin !== null ? Number(g.desired_margin) : null,
  }));

  // Só as vendas a partir do mês da meta mais antiga entram no realizado.
  const sales: { saleDate: string; grossRevenue: number; netProfit: number }[] = [];
  const oldest = goals.at(-1);
  if (oldest) {
    const since = new Date(oldest.year, oldest.month - 1, 1).toISOString();
    for (let from = 0; ; from += SALES_CHUNK) {
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, gross_revenue, net_profit")
        .gte("sale_date", since)
        .order("sale_date")
        .order("id")
        .range(from, from + SALES_CHUNK - 1);
      if (error || !data) break;
      sales.push(
        ...data.map((s) => ({
          saleDate: s.sale_date,
          grossRevenue: Number(s.gross_revenue),
          netProfit: Number(s.net_profit),
        }))
      );
      if (data.length < SALES_CHUNK) break;
    }
  }

  const now = new Date();
  const history = goalHistory(goals, sales, now);

  return (
    <GoalsScreen
      history={history}
      current={{ month: now.getMonth() + 1, year: now.getFullYear() }}
      previous={previousMonthResult(history, now)}
    />
  );
}
