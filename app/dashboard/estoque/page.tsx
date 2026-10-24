import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StockBoard } from "@/components/estoque/stock-board";

export default async function EstoquePage() {
  // Client da sessão: RLS restringe products às linhas do próprio usuário.
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, category, stock_quantity, minimum_stock, current_price")
    .eq("status", "active")
    .order("name");
  const products = data ?? [];

  if (products.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <header>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Estoque</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            O que tem na prateleira
          </h1>
        </header>
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-control bg-primary/10 text-primary">
            <Boxes className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-xl font-bold">Nada na prateleira ainda</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cadastre seus produtos para acompanhar quantas unidades tem de cada um e quanto o estoque vale.
          </p>
          <Button asChild className="mt-2">
            <Link href="/dashboard/produtos/novo">
              <Plus className="h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StockBoard
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stockQuantity: p.stock_quantity,
        minimumStock: p.minimum_stock,
        currentPrice: p.current_price !== null ? Number(p.current_price) : null,
      }))}
    />
  );
}
