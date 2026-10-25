"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSaleDetails } from "@/lib/actions/sale-details";
import { saleBreakdown, type SaleDetails } from "@/lib/vendas/sale-breakdown";
import { paymentMethodLabel } from "@/lib/vendas/sales-view";
import { formatDateTime } from "@/lib/dates";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarginPill } from "@/components/ui/margin-pill";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Linha de venda clicável: envolve o conteúdo num botão que abre o detalhe da venda.
 * Usado na lista de Vendas e nas últimas vendas da Visão geral (páginas de servidor).
 */
export function SaleDetailsButton({
  saleId,
  label,
  className,
  children,
}: {
  saleId: string;
  /** Nome acessível do botão, ex.: "Ver detalhes da venda de camila". */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={cn(
          "w-full cursor-pointer text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {children}
      </button>
      {open && <SaleDetailsDialog saleId={saleId} onClose={() => setOpen(false)} />}
    </>
  );
}

function SaleDetailsDialog({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [sale, setSale] = useState<SaleDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSaleDetails(saleId).then((result) => {
      if (cancelled) return;
      if (result.success) setSale(result.sale);
      else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        {!sale ? (
          <DialogHeader>
            <DialogTitle>Detalhes da venda</DialogTitle>
            <DialogDescription>{loadError ?? "Carregando..."}</DialogDescription>
          </DialogHeader>
        ) : (
          <SaleDetailsContent sale={sale} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaleDetailsContent({ sale }: { sale: SaleDetails }) {
  const breakdown = saleBreakdown(sale);
  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className={cn(!sale.customerName && "text-muted-foreground")}>
          {sale.customerName || "Cliente não informado"}
        </DialogTitle>
        <DialogDescription>
          {formatDateTime(sale.saleDate)}
          {sale.channelName && <> · {sale.channelName}</>} · {paymentMethodLabel(sale.paymentMethod)}
        </DialogDescription>
      </DialogHeader>

      <section aria-label="Itens">
        <h3 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Itens</h3>
        <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
          {sale.items.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {item.quantity} × {formatCurrency(item.unitPrice)} · custo {formatCurrency(item.unitCost)}/peça
                </p>
              </div>
              <p className="shrink-0 font-mono font-semibold">{formatCurrency(item.subtotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="De onde saiu o lucro">
        <h3 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          De onde saiu o lucro
        </h3>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Line label="Valor dos produtos" amount={breakdown.itemsTotal} />
          {breakdown.deductions.map((line) => (
            <Line key={line.label} label={line.label} amount={line.amount} />
          ))}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2.5">
            <dt className="font-semibold">Lucro</dt>
            <dd className="flex items-center gap-2">
              <MarginPill margin={breakdown.margin} />
              <span
                className={cn(
                  "font-mono text-lg font-bold",
                  breakdown.profit < 0 ? "text-destructive" : "text-primary"
                )}
              >
                {formatCurrency(breakdown.profit)}
              </span>
            </dd>
          </div>
        </dl>
        {sale.discount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Faturamento com desconto: {formatCurrency(sale.grossRevenue)}.
          </p>
        )}
      </section>
    </div>
  );
}

function Line({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono", amount < 0 && "text-muted-foreground")}>
        {amount < 0 ? `− ${formatCurrency(-amount)}` : formatCurrency(amount)}
      </dd>
    </div>
  );
}
