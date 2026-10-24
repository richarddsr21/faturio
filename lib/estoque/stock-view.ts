import { isLowStock } from "@/lib/finance/stock";

// Números da tela de Estoque, sem I/O.

export interface StockViewProduct {
  id: string;
  name: string;
  stockQuantity: number;
  minimumStock: number;
  currentPrice: number | null;
}

/** Quanto o estoque do produto vale a preço de venda. */
export function stockPotential(product: Pick<StockViewProduct, "stockQuantity" | "currentPrice">): number {
  return product.stockQuantity * (product.currentPrice ?? 0);
}

export interface CompositionSegment {
  /** id do produto, ou "outros" para o agrupamento. */
  key: string;
  label: string;
  units: number;
  /** Fração do total de unidades (0–1). */
  share: number;
}

/**
 * Segmentos da barra de composição, do maior para o menor. A partir do
 * `maxSegments`-ésimo produto, o resto vira um único segmento "Outros".
 * Produtos zerados ficam de fora.
 */
export function stockComposition(products: StockViewProduct[], maxSegments = 5): CompositionSegment[] {
  const withStock = products.filter((p) => p.stockQuantity > 0).sort((a, b) => b.stockQuantity - a.stockQuantity);
  const total = withStock.reduce((sum, p) => sum + p.stockQuantity, 0);
  if (total === 0) return [];

  const segments: CompositionSegment[] = withStock
    .slice(0, maxSegments)
    .map((p) => ({ key: p.id, label: p.name, units: p.stockQuantity, share: p.stockQuantity / total }));

  const rest = withStock.slice(maxSegments);
  if (rest.length === 1) {
    const [p] = rest;
    segments.push({ key: p.id, label: p.name, units: p.stockQuantity, share: p.stockQuantity / total });
  } else if (rest.length > 1) {
    const units = rest.reduce((sum, p) => sum + p.stockQuantity, 0);
    segments.push({ key: "outros", label: `Outros (${rest.length})`, units, share: units / total });
  }
  return segments;
}

/** Estoque baixo primeiro (o mais crítico no topo); depois por nome. */
export function sortForStockList<T extends StockViewProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const lowA = isLowStock(a.stockQuantity, a.minimumStock);
    const lowB = isLowStock(b.stockQuantity, b.minimumStock);
    if (lowA !== lowB) return lowA ? -1 : 1;
    if (lowA && lowB) {
      const ratio = a.stockQuantity / a.minimumStock - b.stockQuantity / b.minimumStock;
      if (ratio !== 0) return ratio;
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });
}
