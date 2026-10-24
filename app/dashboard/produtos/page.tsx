import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProductList } from "@/components/produtos/product-list";
import { ImportProductsDialog } from "@/components/produtos/import-products-dialog";
import { catalogSummary } from "@/lib/produtos/catalog";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export default async function ProdutosPage() {
  // Client da sessão: RLS restringe products às linhas do próprio usuário.
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, category, cost, current_price, stock_quantity, minimum_stock")
    .eq("status", "active")
    .order("name");
  const products = data ?? [];

  const summary = catalogSummary(
    products.map((p) => ({
      category: p.category,
      cost: Number(p.cost),
      currentPrice: p.current_price !== null ? Number(p.current_price) : null,
      stockQuantity: p.stock_quantity,
    }))
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Produtos</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">Seu catálogo</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportProductsDialog />
          <Button asChild>
            <Link href="/dashboard/produtos/novo">
              <Plus className="h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-control bg-primary/10 text-primary">
            <Package className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-xl font-bold">Seu catálogo está vazio</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cadastre seu primeiro produto ou importe vários de uma vez por planilha. O preço sugerido e a margem
            aparecem aqui.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <ImportProductsDialog />
            <Button asChild>
              <Link href="/dashboard/produtos/novo">
                <Plus className="h-4 w-4" />
                Novo produto
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo do catálogo">
            <KpiCard label="Produtos ativos" value={summary.activeCount} />
            <KpiCard label="Unidades em estoque" value={summary.units.toLocaleString("pt-BR")} />
            <KpiCard label="Valor em estoque" value={formatCurrency(summary.stockValue)} hint="A preço de venda" />
            <KpiCard
              label="Margem média"
              highlight
              value={summary.averageMargin !== null ? formatPercent(summary.averageMargin) : "—"}
              hint="Média entre os produtos"
            />
          </section>

          <ProductList products={products} />
        </>
      )}
    </div>
  );
}
