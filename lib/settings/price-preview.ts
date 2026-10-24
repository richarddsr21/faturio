import { calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";

// Prévia ao vivo da tela de Configurações, sem I/O. Taxas e margem em fração (0,05 = 5%).

export interface PreviewCosts {
  packagingCost: number;
  shippingCost: number;
  giftCost: number;
  trafficCost: number;
  adminFee: number;
  cardFee: number;
}

export interface SalePreview {
  /** Embalagem + frete + brinde + tráfego. */
  perSaleCosts: number;
  /** Taxas (admin + cartão) em fração. */
  feesRate: number;
  /** Taxas em R$ sobre o preço. */
  feesAmount: number;
  /** Custo do produto + custos por venda + taxas. */
  realCost: number;
  profit: number;
  /** Lucro ÷ preço; null sem preço. */
  margin: number | null;
}

/**
 * Lucro de vender 1 unidade pelo preço informado, com a mesma conta do register_sale:
 * preço − custo − taxas sobre o preço − embalagem − frete − brinde − tráfego.
 */
export function salePreview(productCost: number, price: number, costs: PreviewCosts): SalePreview {
  const perSaleCosts = costs.packagingCost + costs.shippingCost + costs.giftCost + costs.trafficCost;
  const feesRate = costs.adminFee + costs.cardFee;
  const feesAmount = price * feesRate;
  const realCost = productCost + perSaleCosts + feesAmount;
  const profit = price - realCost;
  return { perSaleCosts, feesRate, feesAmount, realCost, profit, margin: price > 0 ? profit / price : null };
}

/**
 * Preço sugerido para a margem desejada, igual ao formulário de produto
 * (custo + frete de entrada + embalagem + frete + brinde; tráfego fica de fora lá).
 * null quando as taxas somam 100% ou mais.
 */
export function suggestedPrice(
  product: { cost: number; entryShipping: number },
  costs: PreviewCosts,
  desiredMargin: number
): number | null {
  try {
    return calculateRecommendedPrice({
      fixedCostsPerUnit:
        product.cost + product.entryShipping + costs.packagingCost + costs.shippingCost + costs.giftCost,
      feesPercentage: costs.adminFee + costs.cardFee,
      desiredMargin,
    });
  } catch (error) {
    if (error instanceof PricingError) return null;
    throw error;
  }
}
