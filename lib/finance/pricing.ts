export class PricingError extends Error {}

export interface RecommendedPriceInput {
  fixedCostsPerUnit: number;
  feesPercentage: number;
  desiredMargin: number;
}

export function calculateRecommendedPrice(input: RecommendedPriceInput): number {
  const { fixedCostsPerUnit, feesPercentage, desiredMargin } = input;
  const denominator = 1 - feesPercentage - desiredMargin;

  if (denominator <= 0) {
    throw new PricingError(
      "A soma das taxas percentuais com a margem desejada não pode atingir 100%."
    );
  }

  return fixedCostsPerUnit / denominator;
}
