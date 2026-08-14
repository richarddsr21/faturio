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
