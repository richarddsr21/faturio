import { createClient } from "@/lib/supabase/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { GoalForm } from "@/components/metas/goal-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function MetasPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("id, month, year, revenue_goal, desired_margin")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Metas</h1>
        <p className="text-muted-foreground">Defina sua meta de faturamento mês a mês.</p>
      </div>

      <GoalForm defaultMonth={now.getMonth() + 1} defaultYear={now.getFullYear()} />

      {goals && goals.length > 0 && (
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <p className="font-medium text-foreground">
                  {monthNames[goal.month - 1]} de {goal.year}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="tabular-nums text-sm text-foreground">
                      {formatCurrency(Number(goal.revenue_goal))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Margem desejada</p>
                    <p className="tabular-nums text-sm text-foreground">
                      {goal.desired_margin !== null
                        ? `${(Number(goal.desired_margin) * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Margem desejada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      {monthNames[goal.month - 1]} de {goal.year}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(Number(goal.revenue_goal))}</TableCell>
                    <TableCell className="tabular-nums">
                      {goal.desired_margin !== null
                        ? `${(Number(goal.desired_margin) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
