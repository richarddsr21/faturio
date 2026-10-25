import Link from "next/link";
import { ChevronRight, Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InitialAvatar } from "@/components/ui/initial-avatar";
import { MarginPill } from "@/components/ui/margin-pill";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { QuickActionButton } from "@/components/dashboard/quick-access";
import { SalesSearch } from "@/components/vendas/sales-search";
import { SaleDetailsButton } from "@/components/vendas/sale-details-dialog";
import {
  groupByMonth,
  paymentMethodLabel,
  saleMargin,
  salesPeriods,
  type SalesPeriod,
  type SalesSummary,
} from "@/lib/vendas/sales-view";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

const periodLabels: Record<SalesPeriod, string> = { "7": "7 dias", "30": "30 dias", "90": "90 dias", tudo: "Tudo" };

// Cor de cada forma de pagamento (bolinha na linha e segmento da barra).
const paymentColors: Record<string, string> = {
  pix: "bg-primary",
  cartao_credito: "bg-lilac",
  cartao_debito: "bg-info",
  dinheiro: "bg-warning",
};
const fallbackPaymentColor = "bg-muted-foreground";

export interface SaleListItem {
  id: string;
  saleDate: string;
  paymentMethod: string;
  grossRevenue: number;
  netProfit: number;
  customerName: string | null;
  /** null nas vendas registradas antes dos canais. */
  channelName: string | null;
}

export interface SalesScreenProps {
  summary: SalesSummary;
  sales: SaleListItem[];
  period: SalesPeriod;
  customerQuery: string;
  /** Monta o href da página mantendo os filtros atuais. */
  hrefFor: (changes: { periodo?: SalesPeriod; limite?: number }) => string;
  /** Há mais vendas além das listadas: mostra "Carregar mais" com este limite. */
  nextLimit: number | null;
  /** O usuário tem alguma venda registrada (independente do filtro). */
  hasAnySale: boolean;
}

export function SalesScreen(props: SalesScreenProps) {
  const { summary, sales, period, customerQuery } = props;
  const groups = groupByMonth(sales);
  const topPayment = summary.payments[0];
  const filtered = period !== "tudo" || customerQuery !== "";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Vendas</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Tudo que você já vendeu
          </h1>
        </div>
        <QuickActionButton section="vendas">
          <Plus className="h-4 w-4" />
          Registrar venda
        </QuickActionButton>
      </header>

      {!props.hasAnySale ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-control bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-xl font-bold">Nenhuma venda ainda</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Registre sua primeira venda: o estoque baixa sozinho e o lucro de cada uma aparece aqui.
          </p>
          <Button asChild className="mt-2">
            <Link href="/dashboard/vendas/nova">
              <Plus className="h-4 w-4" />
              Registrar venda
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-[1.2fr_1fr_1.2fr]" aria-label="Resumo das vendas">
            <div className="flex min-w-0 flex-col gap-3 rounded-card bg-primary p-5 text-primary-foreground shadow-[var(--shadow-button-primary)] sm:p-6">
              <p className="text-sm font-medium">Faturamento {filtered ? "no filtro" : "total"}</p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="truncate font-display text-4xl font-bold leading-none tracking-tight tabular-nums">
                  {formatCurrency(summary.revenue)}
                </p>
                <Badge variant="inverse">
                  {summary.count} {summary.count === 1 ? "venda" : "vendas"}
                </Badge>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">Lucro {filtered ? "no filtro" : "total"}</p>
              <p
                className={cn(
                  "truncate font-display text-4xl font-bold leading-none tracking-tight tabular-nums",
                  summary.profit < 0 ? "text-destructive" : "text-primary"
                )}
              >
                {formatCurrency(summary.profit)}
              </p>
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-3 rounded-card border border-border bg-card p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">Forma de pagamento</p>
              {topPayment ? (
                <>
                  <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    {summary.payments.map((p) => (
                      <div
                        key={p.method}
                        className={cn("h-full", paymentColors[p.method] ?? fallbackPaymentColor)}
                        style={{ width: `${p.share * 100}%` }}
                      />
                    ))}
                  </div>
                  {summary.payments.length === 1 ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatPercent(topPayment.share)} {paymentMethodLabel(topPayment.method)}
                      </span>{" "}
                      · {topPayment.count} de {summary.count} {summary.count === 1 ? "venda" : "vendas"}
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {summary.payments.map((p) => (
                        <li key={p.method} className="flex items-center gap-1.5">
                          <span
                            className={cn("h-2 w-2 rounded-full", paymentColors[p.method] ?? fallbackPaymentColor)}
                            aria-hidden
                          />
                          <span className="font-semibold text-foreground">{formatPercent(p.share)}</span>
                          {paymentMethodLabel(p.method)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sem vendas no filtro.</p>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SalesSearch initialQuery={customerQuery} className="md:w-96" />
            <SegmentedNav
              label="Período"
              className="self-start"
              items={salesPeriods.map((p) => ({
                label: periodLabels[p],
                href: props.hrefFor({ periodo: p }),
                active: p === period,
              }))}
            />
          </div>

          {sales.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda
              {customerQuery ? ` de clientes com "${customerQuery}" no nome` : ""}
              {period !== "tudo" ? ` nos últimos ${period} dias` : ""}.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
                  <h2 className="px-1 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    {group.label}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((sale) => (
                      <SaleRow key={sale.id} sale={sale} />
                    ))}
                  </ul>
                </section>
              ))}

              {props.nextLimit !== null && (
                <Button asChild variant="outline" className="self-center">
                  <Link href={props.hrefFor({ limite: props.nextLimit })} scroll={false}>
                    Carregar mais vendas
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SaleRow({ sale }: { sale: SaleListItem }) {
  const margin = saleMargin(sale.grossRevenue, sale.netProfit);

  return (
    <li>
      <SaleDetailsButton
        saleId={sale.id}
        label={`Ver detalhes da venda${sale.customerName ? ` de ${sale.customerName}` : ""}`}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 rounded-control border border-border bg-card px-4 py-3 md:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:gap-x-4"
      >
        <InitialAvatar name={sale.customerName} />
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", !sale.customerName && "text-muted-foreground")}>
            {sale.customerName || "Cliente não informado"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(sale.saleDate)}
            {sale.channelName && <> · {sale.channelName}</>}
            <span className="md:hidden"> · {paymentMethodLabel(sale.paymentMethod)}</span>
          </p>
        </div>

        <span className="hidden md:inline-flex">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", paymentColors[sale.paymentMethod] ?? fallbackPaymentColor)}
              aria-hidden
            />
            {paymentMethodLabel(sale.paymentMethod)}
          </span>
        </span>

        <p className="hidden text-right font-mono text-sm font-semibold md:block">{formatCurrency(sale.grossRevenue)}</p>

        <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:justify-end md:gap-2.5">
          <p className="font-mono text-sm font-semibold md:hidden">{formatCurrency(sale.grossRevenue)}</p>
          <p className={cn("font-mono text-xs md:text-sm", sale.netProfit < 0 ? "text-destructive" : "text-primary")}>
            {sale.netProfit >= 0 ? "+" : ""}
            {formatCurrency(sale.netProfit)}
          </p>
          <MarginPill margin={margin} className="hidden md:inline-flex" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </SaleDetailsButton>
    </li>
  );
}
