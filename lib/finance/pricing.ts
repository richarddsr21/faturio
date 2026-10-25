export class PricingError extends Error {}

export interface RecommendedPriceInput {
  fixedCostsPerUnit: number;
  feesPercentage: number;
  desiredMargin: number;
}

export function calculateRecommendedPrice(input: RecommendedPriceInput): number {
  const { fixedCostsPerUnit, feesPercentage, desiredMargin } = input;
  const denominator = 1 - feesPercentage;

  if (denominator <= 0) {
    throw new PricingError("As taxas percentuais não podem atingir 100%.");
  }

  return (fixedCostsPerUnit * (1 + desiredMargin)) / denominator;
}

export interface ChannelPriceInput {
  /** Custo + frete de entrada + embalagem + frete + brinde, por peça. */
  unitCosts: number;
  /** Taxa administrativa (fração); a de cartão não entra, o canal tem a sua comissão. */
  adminFee: number;
  /** Comissão (fração) e taxa fixa por peça do canal. */
  channel: { commission: number; fixedFee: number };
  /** Markup sobre o custo, como em `calculateRecommendedPrice`. */
  desiredMargin: number;
  currentPrice: number | null;
}

export interface ChannelPrice {
  /** null quando taxa administrativa + comissão chegam a 100%. */
  suggestedPrice: number | null;
  /** Lucro de 1 peça pelo preço atual; null sem preço. */
  profit: number | null;
  /** Lucro ÷ preço atual; null sem preço. */
  margin: number | null;
  /** O preço atual fica abaixo do sugerido, ou seja, abaixo da margem desejada neste canal. */
  belowDesired: boolean;
}

/**
 * Preço ideal e lucro por peça num canal (#15). Mesma regra de taxas do register_sale com
 * canal: a taxa fixa do canal soma aos custos da peça e a comissão soma à administrativa.
 */
export function calculateChannelPrice(input: ChannelPriceInput): ChannelPrice {
  const { unitCosts, adminFee, channel, desiredMargin, currentPrice } = input;
  const fixedCostsPerUnit = unitCosts + channel.fixedFee;
  const feesPercentage = adminFee + channel.commission;

  let suggestedPrice: number | null = null;
  try {
    suggestedPrice = calculateRecommendedPrice({ fixedCostsPerUnit, feesPercentage, desiredMargin });
  } catch (error) {
    if (!(error instanceof PricingError)) throw error;
  }

  if (currentPrice === null || currentPrice <= 0) {
    return { suggestedPrice, profit: null, margin: null, belowDesired: false };
  }
  const profit = currentPrice - fixedCostsPerUnit - currentPrice * feesPercentage;
  // Meio centavo de folga: o preço salvo é o sugerido arredondado para 2 casas.
  const belowDesired = suggestedPrice === null || currentPrice < suggestedPrice - 0.005;
  return { suggestedPrice, profit, margin: profit / currentPrice, belowDesired };
}
