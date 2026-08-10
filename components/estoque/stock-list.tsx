"use client";

import { Fragment, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Estoque atual</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
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
  );
}
