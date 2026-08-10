import { Progress } from "@/components/ui/progress";

export function GoalShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="order-2 rounded-2xl border border-border bg-card p-6 lg:order-1">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-muted-foreground">Meta mensal</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">R$ 50.000</p>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">R$ 37.400</p>
        <div className="mt-4">
          <Progress value={74.8} />
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">74,8%</p>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Falta <span className="font-semibold tabular-nums text-foreground">R$ 12.600</span> —
          você precisa de aproximadamente{" "}
          <span className="font-semibold text-foreground">101 vendas</span> para alcançar sua
          meta.
        </p>
      </div>
      <div className="order-1 lg:order-2">
        <h3 className="text-2xl font-semibold text-foreground">Metas</h3>
        <p className="mt-2 text-muted-foreground">
          Acompanhe em tempo real o quanto falta para bater sua meta do mês.
        </p>
      </div>
    </div>
  );
}
