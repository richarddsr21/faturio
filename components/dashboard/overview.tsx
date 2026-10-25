import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Check,
  CircleCheck,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { InitialAvatar } from "@/components/ui/initial-avatar";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { QuickAccess, QuickActionButton } from "@/components/dashboard/quick-access";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { formatDate } from "@/lib/dates";
import {
  percentChange,
  type CumulativePoint,
  type GoalStatus,
  type MonthTotals,
  type OverviewProduct,
  type TopProduct,
  type YearMonth,
} from "@/lib/dashboard/overview";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatDayMonth(iso: string) {
  return formatDate(iso, { day: "2-digit", month: "2-digit" });
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
  dinheiro: "Dinheiro",
};

export interface RecentSale {
  id: string;
  saleDate: string;
  paymentMethod: string;
  grossRevenue: number;
  netProfit: number;
  customerName: string | null;
}

export interface OverviewProps {
  headline: string;
  selected: YearMonth;
  current: YearMonth;
  monthName: string;
  previousName: string;
  /** Mês atual: a comparação usa o mês anterior só até este dia. null = mês anterior inteiro. */
  comparisonCutDay: number | null;
  totals: MonthTotals;
  previousTotals: MonthTotals;
  goal: GoalStatus;
  champion: TopProduct | null;
  distinctProducts: number;
  series: CumulativePoint[];
  recentSales: RecentSale[];
  stockUnits: number;
  stockPotential: number;
  critical: OverviewProduct | null;
  hasProducts: boolean;
}

export function Overview(props: OverviewProps) {
  const { totals, previousTotals, monthName, previousName, comparisonCutDay, goal } = props;
  const previousMonthNumber = String(props.selected.month === 1 ? 12 : props.selected.month - 1).padStart(2, "0");
  // KPIs: "1 em agosto" (mês fechado) ou "1 até 19/09" (mesmo período do mês anterior).
  const previousHint =
    comparisonCutDay === null ? `em ${previousName}` : `até ${comparisonCutDay}/${previousMonthNumber}`;
  const goalValue = goal.kind === "none" ? null : goal.goal;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Visão geral</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{props.headline}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSwitcher value={props.selected} current={props.current} basePath="/dashboard" />
          <QuickActionButton section="vendas">
            <Plus className="h-4 w-4" />
            Registrar venda
          </QuickActionButton>
          <div className="ml-auto">
            <QuickAccess />
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]" aria-label="Faturamento e lucro">
        <RevenueHero
          monthName={monthName}
          revenue={totals.revenue}
          change={percentChange(totals.revenue, previousTotals.revenue)}
          compareLabel={comparisonCutDay === null ? previousName : `mesmo período de ${previousName}`}
          noComparisonText={
            comparisonCutDay === null
              ? `Sem vendas em ${previousName} para comparar`
              : `Sem vendas no mesmo período de ${previousName} para comparar`
          }
          goal={goal}
        />
        <ProfitCard
          profit={totals.profit}
          margin={totals.margin}
          hasSales={totals.salesCount > 0}
          previousName={previousName}
          previousMargin={previousTotals.salesCount > 0 ? previousTotals.margin : null}
          profitChange={percentChange(totals.profit, previousTotals.profit)}
          partial={comparisonCutDay !== null}
        />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Indicadores do mês">
        <KpiCard
          label="Vendas"
          icon={ShoppingCart}
          value={totals.salesCount}
          hint={`${previousTotals.salesCount} ${previousHint}`}
        />
        <KpiCard
          label="Peças vendidas"
          icon={Package}
          value={totals.pieces}
          hint={
            totals.pieces === 0
              ? "Nenhuma peça ainda"
              : props.distinctProducts === 1 && props.champion
                ? `Todas: ${props.champion.name}`
                : `${props.distinctProducts} produtos diferentes`
          }
        />
        <KpiCard
          label="Ticket médio"
          icon={Receipt}
          value={formatCurrency(totals.averageTicket)}
          hint={`${formatCurrency(previousTotals.averageTicket)} ${previousHint}`}
        />
        <KpiCard
          label="Estoque"
          icon={Boxes}
          value={
            <>
              {props.stockUnits.toLocaleString("pt-BR")}
              <span className="ml-1 text-base font-semibold text-muted-foreground">un.</span>
            </>
          }
          hint={`${formatCurrency(props.stockPotential)} em potencial`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 rounded-card border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Faturamento acumulado</h2>
              <p className="text-xs text-muted-foreground">Dia a dia em {monthName}, contra a meta</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-primary" aria-hidden />
                Faturamento
              </span>
              {goalValue !== null && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 border-t border-dashed border-muted-foreground" aria-hidden />
                  Meta
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <RevenueChart data={props.series} goal={goalValue} monthShort={monthName.slice(0, 3)} />
          </div>
        </div>

        <RecentSales sales={props.recentSales} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Champion champion={props.champion} monthName={monthName} />
        <StockAlert critical={props.critical} hasProducts={props.hasProducts} />
      </section>
    </div>
  );
}

function RevenueHero({
  monthName,
  revenue,
  change,
  compareLabel,
  noComparisonText,
  goal,
}: {
  monthName: string;
  revenue: number;
  change: number | null;
  compareLabel: string;
  noComparisonText: string;
  goal: GoalStatus;
}) {
  const up = change !== null && change >= 0;
  const ChangeIcon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-[var(--shadow-button-primary)] sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">Faturamento de {monthName}</p>
        {goal.kind === "hit" && (
          <Badge variant="inverse">
            <Check className="h-3 w-3" aria-hidden />
            Meta batida
          </Badge>
        )}
      </div>
      <p className="mt-4 font-display text-5xl font-bold leading-none tracking-tight tabular-nums sm:text-6xl">
        {formatCurrency(revenue)}
      </p>
      <p className="mt-3 flex items-center gap-1 text-sm font-medium">
        {change !== null ? (
          <>
            <ChangeIcon className="h-4 w-4" aria-hidden />
            {up ? "+" : ""}
            {formatPercent(change)} vs {compareLabel}
          </>
        ) : (
          <span className="opacity-70">{noComparisonText}</span>
        )}
      </p>

      <div className="mt-auto pt-6">
        {goal.kind === "none" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-primary-foreground/10 px-4 py-3">
            <p className="text-sm font-medium">Você ainda não definiu a meta de {monthName}.</p>
            <Button
              asChild
              size="sm"
              className="bg-primary-foreground text-primary shadow-none hover:bg-primary-foreground/90"
            >
              <Link href="/dashboard/metas">Definir meta</Link>
            </Button>
          </div>
        ) : (
          <GoalBar goal={goal} />
        )}
      </div>
    </div>
  );
}

function GoalBar({ goal }: { goal: Exclude<GoalStatus, { kind: "none" }> }) {
  // Batida: a parte sólida é a meta e o resto (hachurado) é o que passou dela.
  const solid = goal.kind === "hit" ? goal.goalShare : goal.percent;

  return (
    <div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-primary-foreground/15"
        role="progressbar"
        aria-valuenow={Math.round(goal.percent * 100)}
        aria-valuemin={0}
        aria-label="Progresso da meta"
      >
        {goal.kind === "hit" && (
          <div
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, var(--primary-foreground) 0 3px, transparent 3px 7px)",
            }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary-foreground"
          style={{ width: `${Math.min(solid, 1) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs font-medium">
        <span>
          {formatPercent(goal.percent)} da meta de {formatCurrency(goal.goal)}
        </span>
        <span>
          {goal.kind === "hit" ? `${formatCurrency(goal.excess)} acima` : `faltam ${formatCurrency(goal.remaining)}`}
        </span>
      </div>
    </div>
  );
}

function ProfitCard({
  profit,
  margin,
  hasSales,
  previousName,
  previousMargin,
  profitChange,
  partial,
}: {
  profit: number;
  margin: number;
  hasSales: boolean;
  previousName: string;
  previousMargin: number | null;
  profitChange: number | null;
  partial: boolean;
}) {
  let comparison: string | null = null;
  if (previousMargin !== null) {
    comparison = partial
      ? `No mesmo período de ${previousName}, a margem foi ${formatPercent(previousMargin)}.`
      : `${capitalize(previousName)} fechou em ${formatPercent(previousMargin)}.`;
    if (profitChange !== null && hasSales) {
      if (profitChange >= 1) comparison += " Você mais que dobrou o lucro.";
      else if (profitChange > 0) comparison += ` Lucro ${formatPercent(profitChange)} maior.`;
      else if (profitChange < 0) comparison += ` Lucro ${formatPercent(-profitChange)} menor.`;
    }
  }

  return (
    <div className="flex flex-col justify-between gap-6 rounded-card border border-border bg-card p-5 sm:p-7">
      <div>
        <p className="text-sm text-muted-foreground">Lucro líquido</p>
        <p
          className={`mt-3 font-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl ${profit < 0 ? "text-destructive" : "text-primary"}`}
        >
          {formatCurrency(profit)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing value={margin} size={80} strokeWidth={7} label={`Margem do mês: ${formatPercent(margin)}`}>
          <span className="font-mono text-sm font-semibold">{hasSales ? formatPercent(margin) : "—"}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Margem do mês</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {!hasSales ? "Aparece quando houver vendas." : (comparison ?? "Lucro ÷ faturamento das vendas do mês.")}
          </p>
        </div>
      </div>
    </div>
  );
}

function RecentSales({ sales }: { sales: RecentSale[] }) {
  return (
    <div className="flex min-w-0 flex-col rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Últimas vendas</h2>
        <Link href="/dashboard/vendas" className="text-xs font-semibold text-primary hover:underline">
          Ver todas
        </Link>
      </div>
      {sales.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {sales.map((sale) => (
            <li key={sale.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <InitialAvatar name={sale.customerName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{sale.customerName || "Sem cliente"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDayMonth(sale.saleDate)} · {paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod}
                </p>
              </div>
              <div className="text-right font-mono">
                <p className="text-sm font-semibold">{formatCurrency(sale.grossRevenue)}</p>
                <p className={`text-xs ${sale.netProfit < 0 ? "text-destructive" : "text-primary"}`}>
                  {sale.netProfit >= 0 ? "+" : ""}
                  {formatCurrency(sale.netProfit)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Champion({ champion, monthName }: { champion: TopProduct | null; monthName: string }) {
  return (
    <div className="min-w-0 rounded-card border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold">Campeão do mês</h2>
      {champion ? (
        <div className="mt-4 flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-primary font-display text-xl font-bold text-primary-foreground">
            #1
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate font-semibold">{champion.name}</p>
              <p className="shrink-0 font-mono text-sm font-semibold">{formatCurrency(champion.revenue)}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${champion.share * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {champion.quantity} {champion.quantity === 1 ? "unidade" : "unidades"} ·{" "}
              {formatPercent(champion.share)} do faturamento de {monthName}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma venda em {monthName}. O produto que mais faturar aparece aqui.
        </p>
      )}
    </div>
  );
}

function StockAlert({ critical, hasProducts }: { critical: OverviewProduct | null; hasProducts: boolean }) {
  if (!critical) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
            <CircleCheck className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-lg font-bold">Estoque em dia</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {hasProducts ? "Nenhum produto no estoque mínimo." : "Cadastre produtos para acompanhar o estoque."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-warning/30 bg-warning/10 p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-warning text-background">
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-lg font-bold">Estoque acabando</h2>
      </div>
      <p className="line-clamp-2 text-sm text-warning">{critical.name}</p>
      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="font-display text-4xl font-bold text-warning">
          {critical.stockQuantity}
          <span className="ml-1 text-base">un.</span>
        </p>
        <QuickActionButton
          section="estoque"
          size="sm"
          className="bg-warning text-background shadow-none hover:bg-warning/90"
        >
          Repor estoque
        </QuickActionButton>
      </div>
    </div>
  );
}
