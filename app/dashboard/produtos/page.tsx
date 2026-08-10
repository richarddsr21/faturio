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
