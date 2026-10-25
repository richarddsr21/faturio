// Taxas de uma venda por canal (#14, #70). Mesma conta do register_sale
// (migration 20261025000001_register_sale_product_costs): a comissão do canal substitui a
// taxa de cartão de settings; a taxa administrativa vale por item (a do produto ou a de
// settings) sobre o valor do item, com o desconto rateado.

export interface ChannelFees {
  /** Fração (0,14 = 14%). */
  commission: number;
  /** R$ por peça vendida. */
  fixedFee: number;
}

export interface SaleFeesItem {
  quantity: number;
  unitPrice: number;
  /** Fração: a própria do produto ou, sem ela, a de settings. */
  adminFee: number;
}

export interface SaleFeesInput {
  items: SaleFeesItem[];
  discount: number;
  channel: ChannelFees;
}

export function calculateSaleFees({ items, discount, channel }: SaleFeesInput): number {
  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const grossRevenue = itemsTotal - discount;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const adminAmount =
    itemsTotal > 0
      ? (items.reduce((sum, item) => sum + item.quantity * item.unitPrice * item.adminFee, 0) * grossRevenue) /
        itemsTotal
      : 0;
  return adminAmount + grossRevenue * channel.commission + channel.fixedFee * totalQuantity;
}

/** "14% + R$ 4,00 por peça", "Sem taxa", ... para mostrar ao escolher o canal. */
export function describeChannelFees({ commission, fixedFee }: ChannelFees): string {
  const parts: string[] = [];
  if (commission > 0) {
    parts.push(`${(commission * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
  }
  if (fixedFee > 0) {
    parts.push(`${fixedFee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por peça`);
  }
  return parts.length > 0 ? parts.join(" + ") : "Sem taxa";
}
