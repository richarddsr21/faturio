import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import { GoalHeroForm } from "@/components/metas/goal-hero-form";
import { monthNames, type GoalHistoryItem, type GoalState } from "@/lib/metas/goals-view";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const stateBadge: Record<GoalState, { label: string; className: string }> = {
  hit: { label: "Batida", className: "bg-primary text-primary-foreground" },
  missed: { label: "Não batida", className: "bg-warning/15 text-warning" },
  in_progress: { label: "Em andamento", className: "bg-lilac/15 text-lilac" },
  planned: { label: "Planejada", className: "bg-muted text-muted-foreground" },
};

const ringColor: Record<GoalState, string> = {
  hit: "text-primary",
  missed: "text-warning",
  in_progress: "text-lilac",
  planned: "text-muted-foreground",
};

export interface GoalsScreenProps {
  history: GoalHistoryItem[];
  current: { month: number; year: number };
  previous: GoalHistoryItem | null;
}

export function GoalsScreen({ history, current, previous }: GoalsScreenProps) {
  const badge = previous
    ? previous.state === "hit"
      ? { text: `${capitalize(monthNames[previous.month - 1])} bateu ${formatPercent(previous.percent)}`, tone: "hit" as const }
      : { text: `${capitalize(monthNames[previous.month - 1])} ficou em ${formatPercent(previous.percent)}`, tone: "missed" as const }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Metas</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">Quanto você quer faturar?</h1>
      </header>

      <GoalHeroForm
        goals={history.map(({ month, year, revenueGoal, desiredMargin }) => ({ month, year, revenueGoal, desiredMargin }))}
        defaultMonth={current.month}
        defaultYear={current.year}
        badge={badge}
      />

      <section aria-labelledby="goal-history-title" className="flex flex-col gap-3">
        <h2 id="goal-history-title" className="text-xl font-bold">
          Histórico
        </h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-control bg-primary/10 text-primary">
              <Target className="h-5 w-5" aria-hidden />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              Defina sua primeira meta acima. Cada mês aparece aqui com quanto você faturou e se bateu a meta.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {history.map((item) => (
              <GoalCard key={item.key} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GoalCard({ item }: { item: GoalHistoryItem }) {
  const badge = stateBadge[item.state];
  const belowDesired =
    item.desiredMargin !== null && item.realMargin !== null && item.realMargin < item.desiredMargin;

  return (
    <li className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 rounded-card border border-border bg-card p-5 sm:grid-rows-[auto_auto] sm:p-6">
      <ProgressRing
        value={item.percent}
        size={104}
        strokeWidth={9}
        className={ringColor[item.state]}
        wrapperClassName="sm:row-span-2"
        label={`${formatPercent(item.percent)} da meta`}
      >
        <div className="text-center">
          <p className="font-display text-lg font-bold leading-none">{formatPercent(item.percent)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">da meta</p>
        </div>
      </ProgressRing>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:self-end">
        <h3 className="text-lg font-bold capitalize">
          {monthNames[item.month - 1]} {item.year}
        </h3>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
          {badge.label}
        </span>
      </div>
      <dl className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:col-span-1 sm:col-start-2 sm:self-start">
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">Meta</dt>
          <dd className="truncate font-mono text-sm font-semibold">{formatCurrency(item.revenueGoal)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">Realizado</dt>
          <dd className={cn("truncate font-mono text-sm font-semibold", item.state === "hit" && "text-primary")}>
            {formatCurrency(item.revenue)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">Margem desejada</dt>
          <dd className="font-mono text-sm font-semibold">
            {item.desiredMargin !== null ? formatPercent(item.desiredMargin) : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">Margem real</dt>
          <dd className={cn("font-mono text-sm font-semibold", belowDesired && "text-warning")}>
            {item.realMargin !== null ? formatPercent(item.realMargin) : "—"}
          </dd>
        </div>
      </dl>
    </li>
  );
}
