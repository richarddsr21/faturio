"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import {
  getQuickView,
  type QuickViewData,
  type QuickViewSection,
} from "@/lib/actions/quick-view";
import { dashboardSections } from "@/components/dashboard/nav-items";
import { ProductForm } from "@/components/produtos/product-form";
import { StockMovementForm } from "@/components/estoque/stock-movement-form";
import { SaleForm } from "@/components/vendas/sale-form";
import { GoalForm } from "@/components/metas/goal-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

interface SectionCopy {
  description: string;
  formTitle: string;
  formDescription: string;
  createLabel: string;
  done: string;
  page: { label: string; href: string };
}

const sectionCopy: Record<QuickViewSection, SectionCopy> = {
  produtos: {
    description: "Seus produtos cadastrados mais recentes.",
    formTitle: "Novo produto",
    formDescription: "O preço de venda é sugerido a partir dos custos e da margem.",
    createLabel: "Novo produto",
    done: "Produto cadastrado.",
    page: { label: "Ver todos", href: "/dashboard/produtos" },
  },
  estoque: {
    description: "Produtos que estão abaixo do estoque mínimo.",
    formTitle: "Movimentar estoque",
    formDescription: "Registre uma entrada, um ajuste ou uma devolução.",
    createLabel: "Movimentar estoque",
    done: "Movimentação registrada.",
    page: { label: "Ver estoque", href: "/dashboard/estoque" },
  },
  vendas: {
    description: "Suas vendas mais recentes.",
    formTitle: "Registrar venda",
    formDescription: "O estoque dos produtos é atualizado automaticamente.",
    createLabel: "Registrar venda",
    done: "Venda registrada.",
    page: { label: "Ver todas", href: "/dashboard/vendas" },
  },
  metas: {
    description: "Como está a meta de faturamento deste mês.",
    formTitle: "Definir meta",
    formDescription: "Se o mês já tiver meta, ela é substituída pela nova.",
    createLabel: "Definir meta",
    done: "Meta salva.",
    page: { label: "Ver metas", href: "/dashboard/metas" },
  },
};

const quickAccessSections = dashboardSections.filter(
  (item): item is (typeof dashboardSections)[number] & { section: QuickViewSection } =>
    item.section in sectionCopy
);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[10px] bg-muted px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular-nums font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ItemList({ children, empty }: { children: ReactNode[]; empty: string }) {
  if (children.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-[10px] border border-border">
      {children}
    </ul>
  );
}

function Row({ title, subtitle, value }: { title: string; subtitle?: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="shrink-0 text-right tabular-nums text-sm text-foreground">{value}</div>
    </li>
  );
}

function NeedsProducts() {
  return (
    <p className="text-sm text-muted-foreground">
      Cadastre um produto primeiro —{" "}
      <Link href="/dashboard/produtos/novo" className="font-medium text-primary hover:underline">
        novo produto
      </Link>
      .
    </p>
  );
}

function Summary({ data }: { data: QuickViewData }) {
  switch (data.section) {
    case "produtos":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Produtos ativos" value={String(data.total)} />
            <Stat
              label="Sem preço de venda"
              value={String(data.withoutPrice)}
              hint={data.withoutPrice > 0 ? "defina o preço para vender" : undefined}
            />
          </div>
          <ItemList empty="Nenhum produto cadastrado ainda.">
            {data.recent.map((p) => (
              <Row
                key={p.id}
                title={p.name}
                subtitle={`Custo ${formatCurrency(p.cost)}`}
                value={p.currentPrice !== null ? formatCurrency(p.currentPrice) : "sem preço"}
              />
            ))}
          </ItemList>
        </div>
      );

    case "estoque":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Unidades em estoque" value={`${data.totalUnits} un.`} />
            <Stat label="Abaixo do mínimo" value={String(data.lowStockCount)} />
          </div>
          <ItemList empty="Nenhum produto abaixo do estoque mínimo. Tudo em dia!">
            {data.lowStock.map((p) => (
              <Row
                key={p.id}
                title={p.name}
                subtitle={`Mínimo: ${p.minimum} un.`}
                value={
                  <span className="flex items-center gap-1.5 text-destructive">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    {p.stock} un.
                  </span>
                }
              />
            ))}
          </ItemList>
          {data.lowStockCount > data.lowStock.length && (
            <p className="text-xs text-muted-foreground">
              E mais {data.lowStockCount - data.lowStock.length} produto(s) abaixo do mínimo.
            </p>
          )}
        </div>
      );

    case "vendas":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Hoje" value={formatCurrency(data.todayRevenue)} />
            <Stat
              label="Este mês"
              value={formatCurrency(data.monthRevenue)}
              hint={`${data.monthCount} ${data.monthCount === 1 ? "venda" : "vendas"}`}
            />
          </div>
          <ItemList empty="Nenhuma venda registrada ainda.">
            {data.recent.map((s) => (
              <Row
                key={s.id}
                title={s.customerName ?? "Sem cliente"}
                subtitle={`${new Date(s.saleDate).toLocaleDateString("pt-BR")} · ${
                  paymentMethodLabels[s.paymentMethod] ?? s.paymentMethod
                }`}
                value={formatCurrency(s.grossRevenue)}
              />
            ))}
          </ItemList>
        </div>
      );

    case "metas": {
      const monthLabel = `${monthNames[data.month - 1]} de ${data.year}`;
      if (data.goal === null) {
        return (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">Você ainda não definiu a meta de {monthLabel}.</p>
            <Stat label="Faturado no mês" value={formatCurrency(data.revenue)} />
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm text-muted-foreground">Meta de {monthLabel}</p>
              <p className="tabular-nums font-semibold text-foreground">{formatPercent(data.progress)}</p>
            </div>
            <Progress value={data.progress * 100} aria-label="Progresso da meta" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Meta" value={formatCurrency(data.goal)} />
            <Stat label="Faturado" value={formatCurrency(data.revenue)} />
            <Stat
              label="Falta"
              value={formatCurrency(data.remaining)}
              hint={
                data.remaining > 0 && data.estimatedSalesNeeded > 0
                  ? `~${data.estimatedSalesNeeded} vendas`
                  : data.remaining === 0
                    ? "meta batida!"
                    : undefined
              }
            />
          </div>
        </div>
      );
    }
  }
}

function StockQuickForm({
  products,
  onDone,
}: {
  products: { id: string; name: string; stock: number }[];
  onDone: () => void;
}) {
  const [productId, setProductId] = useState("");
  if (products.length === 0) return <NeedsProducts />;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="quick-stock-product" className="mb-1.5 block text-sm font-medium text-foreground">
          Produto
        </label>
        <Select
          id="quick-stock-product"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          <option value="">Selecione</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.stock} un.
            </option>
          ))}
        </Select>
      </div>
      {productId && <StockMovementForm key={productId} productId={productId} onDone={onDone} />}
    </div>
  );
}

function SectionForm({ data, onDone }: { data: QuickViewData; onDone: () => void }) {
  switch (data.section) {
    case "produtos":
      return <ProductForm settings={data.settings} onCreated={onDone} />;
    case "estoque":
      return <StockQuickForm products={data.products} onDone={onDone} />;
    case "vendas":
      return data.products.length > 0 ? (
        <SaleForm products={data.products} onRegistered={onDone} />
      ) : (
        <NeedsProducts />
      );
    case "metas":
      return <GoalForm embedded defaultMonth={data.month} defaultYear={data.year} onSaved={onDone} />;
  }
}

// Montado com key={section}: cada área aberta começa com o estado limpo.
function QuickViewDialog({ section, onClose }: { section: QuickViewSection; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<QuickViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"summary" | "form">("summary");
  const [notice, setNotice] = useState<string | null>(null);
  const item = quickAccessSections.find((s) => s.section === section)!;
  const copy = sectionCopy[section];
  const Icon = item.icon;

  async function load() {
    const result = await getQuickView(section);
    if (result.success) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getQuickView(section).then((result) => {
      if (cancelled) return;
      if (result.success) setData(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [section]);

  async function handleDone() {
    setView("summary");
    setNotice(copy.done);
    router.refresh(); // atualiza os cards da Visão geral atrás do modal
    await load();
  }

  const inForm = view === "form";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle>{inForm ? copy.formTitle : item.label}</DialogTitle>
              <DialogDescription>{inForm ? copy.formDescription : copy.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {inForm && data ? (
          <div className="mt-5 flex flex-col gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 self-start"
              onClick={() => setView("summary")}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao resumo
            </Button>
            <SectionForm data={data} onDone={handleDone} />
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-4" aria-live="polite" aria-busy={!data && !error}>
              {notice && (
                <p className="flex items-center gap-2 rounded-[10px] bg-success/10 px-3 py-2 text-sm text-success">
                  <CircleCheck className="h-4 w-4" aria-hidden="true" />
                  {notice}
                </p>
              )}
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : data ? (
                <Summary data={data} />
              ) : (
                <div className="flex flex-col gap-3" aria-label="Carregando">
                  <div className="h-16 animate-pulse rounded-[10px] bg-muted" />
                  <div className="h-28 animate-pulse rounded-[10px] bg-muted" />
                </div>
              )}
            </div>

            <DialogFooter className="flex-wrap">
              <Button asChild variant="ghost">
                <Link href={copy.page.href}>
                  {copy.page.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                disabled={!data}
                onClick={() => {
                  setNotice(null);
                  setView("form");
                }}
              >
                {copy.createLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Atalhos da Visão geral: um ícone por área (produtos, estoque, vendas, metas). Cada um
 * abre um modal com o resumo da área e o formulário de cadastro. Só no desktop.
 */
export function QuickAccess() {
  const [selected, setSelected] = useState<QuickViewSection | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <nav aria-label="Atalhos das áreas" className="hidden items-center gap-1 md:flex">
        {quickAccessSections.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.section}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={item.label}
                  aria-haspopup="dialog"
                  onClick={() => setSelected(item.section)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {selected && (
        <QuickViewDialog key={selected} section={selected} onClose={() => setSelected(null)} />
      )}
    </TooltipProvider>
  );
}
