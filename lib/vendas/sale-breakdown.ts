// Composição do lucro de uma venda (#10), sem I/O. Mesma conta do register_sale:
// lucro = Σ(qtd × (preço − custo)) − desconto − taxas − frete − embalagem − brinde − tráfego.

export interface SaleDetailItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  /** Custo da peça na hora da venda (custo + frete de entrada). */
  unitCost: number;
  subtotal: number;
}

export interface SaleDetails {
  id: string;
  saleDate: string;
  customerName: string | null;
  paymentMethod: string;
  /** null nas vendas registradas antes dos canais. */
  channelName: string | null;
  items: SaleDetailItem[];
  discount: number;
  /** Faturamento já com desconto. */
  grossRevenue: number;
  fees: number;
  shippingCost: number;
  packagingCost: number;
  giftCost: number;
  trafficCost: number;
  netProfit: number;
}

export interface BreakdownLine {
  label: string;
  /** Negativo = sai do faturamento. */
  amount: number;
}

export interface SaleBreakdown {
  /** Soma dos itens, antes do desconto. */
  itemsTotal: number;
  /** Itens que tiram do faturamento; custos zerados ficam de fora. */
  deductions: BreakdownLine[];
  profit: number;
  /** Lucro ÷ faturamento; null se a venda saiu de graça. */
  margin: number | null;
}

export function saleBreakdown(sale: SaleDetails): SaleBreakdown {
  const itemsTotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
  const productCost = sale.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const candidates: BreakdownLine[] = [
    { label: "Desconto", amount: -sale.discount },
    { label: "Custo dos produtos", amount: -productCost },
    { label: sale.channelName ? `Taxas (${sale.channelName})` : "Taxas", amount: -sale.fees },
    { label: "Frete", amount: -sale.shippingCost },
    { label: "Embalagem", amount: -sale.packagingCost },
    { label: "Brinde", amount: -sale.giftCost },
    { label: "Tráfego pago", amount: -sale.trafficCost },
  ];
  return {
    itemsTotal,
    // "Custo dos produtos" sempre aparece; os demais só quando houve o custo.
    deductions: candidates.filter((line) => line.label === "Custo dos produtos" || Math.abs(line.amount) >= 0.005),
    // O lucro é o gravado na venda, não recalculado: é o mesmo número da lista de vendas.
    profit: sale.netProfit,
    margin: sale.grossRevenue > 0 ? sale.netProfit / sale.grossRevenue : null,
  };
}
