"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StockMovementForm } from "@/components/estoque/stock-movement-form";
import { cn } from "@/lib/utils";

export interface StockListProduct {
  id: string;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
}

export function StockList({ products }: { products: StockListProduct[] }) {
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, search]);

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>;
  }

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
        {filteredProducts.map((product) => {
          const isLow = product.stock_quantity < product.minimum_stock;
          const isOpen = openProductId === product.id;
          return (
            <div
              key={product.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{product.name}</p>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 text-sm text-foreground",
                    isLow && "rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"
                  )}
                >
                  {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                  {product.stock_quantity} un.
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 -ml-3"
                onClick={() => setOpenProductId(isOpen ? null : product.id)}
              >
                {isOpen ? "Fechar" : "Registrar movimento"}
              </Button>
              {isOpen && (
                <div className="mt-2 rounded-xl bg-muted/40 p-3">
                  <StockMovementForm productId={product.id} onDone={() => setOpenProductId(null)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Estoque atual</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const isLow = product.stock_quantity < product.minimum_stock;
              return (
                <Fragment key={product.id}>
                  <TableRow>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          isLow && "rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"
                        )}
                      >
                        {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                        {product.stock_quantity} un.
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenProductId(openProductId === product.id ? null : product.id)}
                      >
                        {openProductId === product.id ? "Fechar" : "Registrar movimento"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {openProductId === product.id && (
                    <TableRow>
                      <TableCell colSpan={3} className="bg-muted/40">
                        <StockMovementForm productId={product.id} onDone={() => setOpenProductId(null)} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
