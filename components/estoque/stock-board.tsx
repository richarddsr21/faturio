"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, TriangleAlert, Undo2 } from "lucide-react";
import { registerStockMovement } from "@/lib/actions/stock";
import { cn } from "@/lib/utils";
import { isLowStock } from "@/lib/finance/stock";
import { productInitials } from "@/lib/produtos/catalog";
import { sortForStockList, stockComposition, stockPotential, type StockViewProduct } from "@/lib/estoque/stock-view";
import { SearchInput } from "@/components/ui/search-input";
import { QuickMovementCard } from "@/components/estoque/quick-movement-card";

export interface StockBoardProduct extends StockViewProduct {
  category: string | null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cores dos segmentos da barra de composição, na ordem do maior para o menor.
const segmentColors = ["bg-primary", "bg-lilac", "bg-warning", "bg-info", "bg-foreground/60", "bg-muted-foreground/50"];

interface LastChange {
  productId: string;
  name: string;
  delta: number;
}

export function StockBoard({ products }: { products: StockBoardProduct[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<LastChange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // +/− mostram o novo número na hora; o valor real chega no router.refresh().
  const [optimisticProducts, applyDelta] = useOptimistic(
    products,
    (state, change: { productId: string; delta: number }) =>
      state.map((p) => (p.id === change.productId ? { ...p, stockQuantity: p.stockQuantity + change.delta } : p))
  );

  useEffect(() => {
    if (!lastChange) return;
    const timer = setTimeout(() => setLastChange(null), 8000);
    return () => clearTimeout(timer);
  }, [lastChange]);

  const totalUnits = optimisticProducts.reduce((sum, p) => sum + p.stockQuantity, 0);
  const totalPotential = optimisticProducts.reduce((sum, p) => sum + stockPotential(p), 0);
  const composition = useMemo(() => stockComposition(optimisticProducts), [optimisticProducts]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const filtered = query
      ? optimisticProducts.filter((p) => p.name.toLocaleLowerCase("pt-BR").includes(query))
      : optimisticProducts;
    return sortForStockList(filtered);
  }, [optimisticProducts, search]);

  /**
   * Um movimento por vez por produto: a Server Action lê o estoque e grava o novo
   * valor em passos separados, então cliques em paralelo poderiam se sobrescrever.
   */
  function move(product: StockBoardProduct, delta: 1 | -1, options: { undo?: boolean } = {}) {
    if (pendingId) return;
    setError(null);
    setPendingId(product.id);
    startTransition(async () => {
      applyDelta({ productId: product.id, delta });
      const result = await registerStockMovement({
        productId: product.id,
        // "+" é entrada de mercadoria; "−" é saída manual (ajuste negativo).
        type: delta > 0 && !options.undo ? "entry" : "adjustment",
        quantity: delta,
        reason: options.undo ? "Desfeito no Estoque" : delta > 0 ? undefined : "Saída manual",
      });
      if (!result.success) {
        setError(result.error ?? "Não foi possível registrar o movimento.");
      } else {
        setLastChange(options.undo ? null : { productId: product.id, name: product.name, delta });
        router.refresh();
      }
      setPendingId(null);
    });
  }

  function undo() {
    if (!lastChange) return;
    const product = products.find((p) => p.id === lastChange.productId);
    if (product) move(product, lastChange.delta > 0 ? -1 : 1, { undo: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Estoque</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            O que tem na prateleira
          </h1>
        </div>
        <SearchInput
          className="w-full sm:w-80"
          placeholder="Buscar produto pelo nome..."
          aria-label="Buscar produto pelo nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col justify-between gap-6 rounded-card border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Unidades em estoque</p>
              <p className="mt-2 font-display text-6xl font-bold leading-none tracking-tight tabular-nums sm:text-7xl">
                {totalUnits.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Se vender tudo</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-primary tabular-nums sm:text-3xl">
                {formatCurrency(totalPotential)}
              </p>
            </div>
          </div>

          {composition.length > 0 && (
            <div>
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {composition.map((segment, index) => (
                  <div
                    key={segment.key}
                    className={cn("h-full first:rounded-l-full last:rounded-r-full", segmentColors[index])}
                    style={{ width: `${segment.share * 100}%` }}
                  />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {composition.map((segment, index) => (
                  <li key={segment.key} className="flex min-w-0 items-center gap-1.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", segmentColors[index])} aria-hidden />
                    <span className="max-w-48 truncate">{segment.label}</span>
                    <span className="font-mono">· {segment.units}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <QuickMovementCard products={products} />
      </section>

      <div aria-live="polite" className="empty:hidden">
        {error && (
          <p className="rounded-control border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
        {lastChange && !error && (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-card px-4 py-2.5 text-sm">
            <span>
              <span className="font-semibold">{lastChange.name}</span>:{" "}
              {lastChange.delta > 0 ? "entrada de 1 un." : "saída de 1 un."}
            </span>
            <button
              type="button"
              onClick={undo}
              disabled={pendingId !== null}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Desfazer
            </button>
          </p>
        )}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado para &quot;{search.trim()}&quot;.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {visibleProducts.map((product) => {
            const low = isLowStock(product.stockQuantity, product.minimumStock);
            const busy = pendingId === product.id;
            const potential = formatCurrency(stockPotential(product));
            return (
              <li
                key={product.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border px-4 py-3.5 sm:flex-nowrap sm:gap-4 sm:px-5",
                  low ? "border-warning/30 bg-warning/10" : "border-border bg-card"
                )}
              >
                {low ? (
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-warning text-background"
                  >
                    <TriangleAlert className="h-5 w-5" />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-muted font-display text-sm font-bold text-primary"
                  >
                    {productInitials(product.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-auto">
                  <p className="truncate text-sm font-semibold" title={product.name}>
                    {product.name}
                  </p>
                  <p className={cn("truncate text-xs", low ? "text-warning" : "text-muted-foreground")}>
                    {low ? "Estoque baixo" : (product.category ?? "Sem categoria")} · {potential} em potencial
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 pl-14 sm:w-auto sm:pl-0">
                  <p
                    className={cn(
                      "shrink-0 font-display text-2xl font-bold tabular-nums sm:text-3xl",
                      low && "text-warning"
                    )}
                    aria-label={`${product.stockQuantity} unidades`}
                  >
                    {product.stockQuantity}
                    <span className="ml-0.5 text-sm font-semibold">un.</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(product, -1)}
                      disabled={busy || pendingId !== null || product.stockQuantity <= 0}
                      aria-label={`Saída de 1 unidade de ${product.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(product, 1)}
                      disabled={busy || pendingId !== null}
                      aria-label={`Entrada de 1 unidade de ${product.name}`}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-[10px] text-background transition-colors disabled:opacity-40",
                        low ? "bg-warning hover:bg-warning/90" : "bg-primary hover:bg-primary-hover"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
