// Taxas de uma venda por canal (#14). Mesma conta do register_sale
// (migration 20261025000000_sales_channels): a comissão do canal substitui a taxa de
// cartão de settings; a taxa administrativa continua valendo em todo canal.

export interface ChannelFees {
  /** Fração (0,14 = 14%). */
  commission: number;
  /** R$ por peça vendida. */
  fixedFee: number;
}

export interface SaleFeesInput {
  /** Faturamento já com desconto. */
  grossRevenue: number;
  totalQuantity: number;
  /** Fração, de settings. */
  adminFee: number;
  channel: ChannelFees;
}

export function calculateSaleFees({ grossRevenue, totalQuantity, adminFee, channel }: SaleFeesInput): number {
  return grossRevenue * (adminFee + channel.commission) + channel.fixedFee * totalQuantity;
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
