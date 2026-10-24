/**
 * Estoque baixo: no mínimo ou abaixo dele. Produto com mínimo 0 nunca alerta
 * (o usuário não definiu um mínimo para ele).
 */
export function isLowStock(stockQuantity: number, minimumStock: number): boolean {
  return minimumStock > 0 && stockQuantity <= minimumStock;
}
