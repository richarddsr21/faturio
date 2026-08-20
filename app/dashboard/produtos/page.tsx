import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, cost, current_price, stock_quantity, minimum_stock")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">Cadastre e gerencie os produtos que você vende.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/produtos/novo">Novo produto</Link>
        </Button>
      </div>

      {products && products.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category ?? "—"}</p>
                  </div>
                  <Link
                    href={`/dashboard/produtos/${product.id}/editar`}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Custo</p>
                    <p className="tabular-nums text-sm text-foreground">
                      {formatCurrency(Number(product.cost))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="tabular-nums text-sm text-foreground">
                      {formatCurrency(product.current_price !== null ? Number(product.current_price) : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque</p>
                    <p
                      className={
                        product.stock_quantity < product.minimum_stock
                          ? "text-sm font-medium text-warning"
                          : "tabular-nums text-sm text-foreground"
                      }
                    >
                      {product.stock_quantity} un.
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.category ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(Number(product.cost))}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(product.current_price !== null ? Number(product.current_price) : null)}
                    </TableCell>
                    <TableCell
                      className={
                        product.stock_quantity < product.minimum_stock
                          ? "font-medium text-warning"
                          : "tabular-nums"
                      }
                    >
                      {product.stock_quantity} un.
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/produtos/${product.id}/editar`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Editar
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda —{" "}
          <Link href="/dashboard/produtos/novo" className="font-medium text-primary hover:underline">
            adicionar produto
          </Link>
          .
        </p>
      )}
    </div>
  );
}
