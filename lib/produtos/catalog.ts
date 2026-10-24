// Números do catálogo (tela de Produtos), sem I/O.

export interface CatalogProduct {
  category: string | null;
  cost: number;
  currentPrice: number | null;
  stockQuantity: number;
}

/**
 * Margem sobre o preço de venda: (preço − custo) ÷ preço. Mesmo custo usado no lucro
 * de cada venda (register_sale usa products.cost). null quando o produto não tem preço.
 */
export function productMargin(cost: number, price: number | null): number | null {
  if (price === null || price <= 0) return null;
  return (price - cost) / price;
}

export interface CatalogSummary {
  activeCount: number;
  units: number;
  /** Quanto o estoque vale a preço de venda. */
  stockValue: number;
  /** Média simples das margens dos produtos com preço; null se nenhum tem preço. */
  averageMargin: number | null;
}

export function catalogSummary(products: CatalogProduct[]): CatalogSummary {
  const margins = products
    .map((p) => productMargin(p.cost, p.currentPrice))
    .filter((m): m is number => m !== null);
  return {
    activeCount: products.length,
    units: products.reduce((sum, p) => sum + p.stockQuantity, 0),
    stockValue: products.reduce((sum, p) => sum + p.stockQuantity * (p.currentPrice ?? 0), 0),
    averageMargin: margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null,
  };
}

/** Categorias distintas, em ordem alfabética (pt-BR), ignorando vazias e caixa. */
export function catalogCategories(products: Pick<CatalogProduct, "category">[]): string[] {
  const byKey = new Map<string, string>();
  for (const p of products) {
    const name = p.category?.trim();
    if (name && !byKey.has(name.toLocaleLowerCase("pt-BR"))) byKey.set(name.toLocaleLowerCase("pt-BR"), name);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Iniciais para o avatar do produto: "Camiseta básica preta" → "CB". */
export function productInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toLocaleUpperCase("pt-BR");
}
