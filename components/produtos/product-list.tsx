"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChips } from "@/components/ui/filter-chips";
import { MarginBar } from "@/components/ui/margin-bar";
import { StockBadge } from "@/components/ui/stock-badge";
import { isLowStock } from "@/lib/finance/stock";
import { catalogCategories, productInitials, productMargin } from "@/lib/produtos/catalog";

export interface ProductListItem {
  id: string;
  name: string;
  category: string | null;
  cost: number;
  current_price: number | null;
  stock_quantity: number;
  minimum_stock: number;
}

const ALL = "__todos__";

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProductAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-muted font-display text-sm font-bold text-primary"
    >
      {productInitials(name)}
    </span>
  );
}

function CategoryTag({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {category}
    </span>
  );
}

function EditButton({ id, name }: { id: string; name: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-9">
      <Link href={`/dashboard/produtos/${id}/editar`} aria-label={`Editar ${name}`}>
        Editar
      </Link>
    </Button>
  );
}

const desktopColumns = "grid-cols-[minmax(0,2.6fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_5.5rem]";

export function ProductList({ products }: { products: ProductListItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(() => catalogCategories(products), [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const categoryKey = category.toLocaleLowerCase("pt-BR");
    return products.filter(
      (product) =>
        (!query || product.name.toLocaleLowerCase("pt-BR").includes(query)) &&
        (category === ALL || product.category?.trim().toLocaleLowerCase("pt-BR") === categoryKey)
    );
  }, [products, search, category]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput
          className="md:w-80"
          placeholder="Buscar produto pelo nome..."
          aria-label="Buscar produto pelo nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {categories.length > 0 && (
          <FilterChips
            label="Filtrar por categoria"
            value={category}
            onChange={setCategory}
            options={[{ value: ALL, label: "Todos" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado
          {search.trim() ? ` para "${search.trim()}"` : ""}
          {category !== ALL ? ` em ${category}` : ""}.
        </p>
      ) : (
        <>
          {/* Celular: um card por produto. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {filteredProducts.map((product) => {
              const price = product.current_price !== null ? Number(product.current_price) : null;
              return (
                <li key={product.id} className="rounded-card border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <ProductAvatar name={product.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{product.name}</p>
                      <CategoryTag category={product.category} />
                    </div>
                    <EditButton id={product.id} name={product.name} />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Custo</dt>
                      <dd className="font-mono text-muted-foreground">{formatCurrency(Number(product.cost))}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Preço</dt>
                      <dd className="font-mono font-semibold">{formatCurrency(price)}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Estoque</dt>
                      <dd>
                        <StockBadge
                          quantity={product.stock_quantity}
                          low={isLowStock(product.stock_quantity, product.minimum_stock)}
                        />
                      </dd>
                    </div>
                  </dl>
                  <MarginBar className="mt-3" margin={productMargin(Number(product.cost), price)} />
                </li>
              );
            })}
          </ul>

          {/* Desktop: linhas em grade. */}
          <div className="hidden flex-col gap-2 md:flex">
            <div
              className={`grid ${desktopColumns} items-center gap-4 px-4 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground`}
            >
              <span>Produto</span>
              <span>Custo</span>
              <span>Preço</span>
              <span>Margem</span>
              <span>Estoque</span>
              <span className="sr-only">Ações</span>
            </div>
            <ul className="flex flex-col gap-2">
              {filteredProducts.map((product) => {
                const price = product.current_price !== null ? Number(product.current_price) : null;
                return (
                  <li
                    key={product.id}
                    className={`grid ${desktopColumns} items-center gap-4 rounded-control border border-border bg-card px-4 py-3 transition-colors hover:border-muted-foreground/30`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ProductAvatar name={product.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" title={product.name}>
                          {product.name}
                        </p>
                        <CategoryTag category={product.category} />
                      </div>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatCurrency(Number(product.cost))}
                    </span>
                    <span className="font-mono text-sm font-semibold">{formatCurrency(price)}</span>
                    <MarginBar margin={productMargin(Number(product.cost), price)} />
                    <span>
                      <StockBadge
                        quantity={product.stock_quantity}
                        low={isLowStock(product.stock_quantity, product.minimum_stock)}
                      />
                    </span>
                    <EditButton id={product.id} name={product.name} />
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
