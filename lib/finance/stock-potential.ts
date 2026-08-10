export interface StockPotentialItem {
  stockQuantity: number;
  currentPrice: number;
}

export function calculateStockPotential(products: StockPotentialItem[]): number {
  return products.reduce((sum, p) => sum + p.stockQuantity * p.currentPrice, 0);
}

export function meetsGoalWithStock(potential: number, goal: number): boolean {
  return potential >= goal;
}
