"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export interface ProductListItem {
  id: string;
  name: string;
  category: string | null;
  cost: number;
  current_price: number | null;
  stock_quantity: number;
  minimum_stock: number;
}

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductList({ products }: { products: ProductListItem[] }) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, search]);

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar produto pelo nome..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {filteredProducts.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado para &quot;{search}&quot;.</p>
      )}

      <div className="flex flex-col gap-3 sm:hidden">
        {filteredProducts.map((product) => (
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
                <p className="tabular-nums text-sm text-foreground">{formatCurrency(Number(product.cost))}</p>
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
            {filteredProducts.map((product) => (
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
  );
}
