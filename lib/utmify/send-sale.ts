// Notificação de venda aprovada para a UTMify (API de pedidos:
// https://docs.utmify.com.br/envio-de-vendas). Versão simples: só envia a venda paga, sem
// UTMs — a UTMify registra a venda (e o app notifica), mas sem atribuir campanha.
//
// Só roda no servidor: UTMIFY_API_TOKEN não tem prefixo NEXT_PUBLIC_ e nunca chega ao client.

const UTMIFY_ORDERS_URL = "https://api.utmify.com.br/api-credentials/orders";

/** Campos do pagamento do Mercado Pago (GET /v1/payments/{id}) usados aqui. */
export interface MercadoPagoPaymentForUtmify {
  id: number | string;
  date_created: string;
  date_approved: string | null;
  transaction_amount: number;
  payment_type_id?: string;
  payment_method_id?: string;
  fee_details?: { amount: number }[];
  transaction_details?: { net_received_amount?: number };
}

export interface UtmifyCustomer {
  name: string;
  email: string;
}

export type UtmifyPaymentMethod = "credit_card" | "boleto" | "pix" | "paypal" | "free_price";

const toCents = (value: number) => Math.round(value * 100);

/** "2026-10-02T14:35:13.000-03:00" → "2026-10-02 17:35:13" (UTC, formato exigido pela UTMify). */
export function toUtmifyDate(value: string): string {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * A UTMify só aceita credit_card, boleto, pix, paypal e free_price. Débito e saldo em conta do
 * Mercado Pago não têm equivalente — vão como credit_card (cartão/carteira), que é o mais
 * próximo para fins de notificação.
 */
export function toUtmifyPaymentMethod(payment: MercadoPagoPaymentForUtmify): UtmifyPaymentMethod {
  if (payment.payment_method_id === "pix" || payment.payment_type_id === "bank_transfer") return "pix";
  if (payment.payment_type_id === "ticket") return "boleto";
  return "credit_card";
}

export function buildPaidOrder(payment: MercadoPagoPaymentForUtmify, customer: UtmifyCustomer) {
  const totalPriceInCents = toCents(payment.transaction_amount);
  const gatewayFeeInCents = toCents(
    (payment.fee_details ?? []).reduce((sum, fee) => sum + fee.amount, 0)
  );
  const net = payment.transaction_details?.net_received_amount;
  // A UTMify não aceita comissão 0 quando houve recebimento; sem o líquido, usa bruto − taxa.
  const userCommissionInCents =
    net && net > 0 ? toCents(net) : Math.max(totalPriceInCents - gatewayFeeInCents, 1);

  return {
    orderId: String(payment.id),
    platform: "Faturio",
    paymentMethod: toUtmifyPaymentMethod(payment),
    status: "paid" as const,
    createdAt: toUtmifyDate(payment.date_created),
    approvedDate: toUtmifyDate(payment.date_approved ?? payment.date_created),
    refundedAt: null,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: null,
      document: null,
      country: "BR",
    },
    products: [
      {
        id: "faturio-acesso",
        name: "Faturio — Acesso completo",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: totalPriceInCents,
      },
    ],
    trackingParameters: {
      src: null,
      sck: null,
      utm_source: null,
      utm_campaign: null,
      utm_medium: null,
      utm_content: null,
      utm_term: null,
    },
    commission: { totalPriceInCents, gatewayFeeInCents, userCommissionInCents },
  };
}

export type UtmifySendResult =
  | { sent: true }
  | { sent: false; reason: "missing_token" | "request_failed"; detail?: string };

/**
 * Envia a venda paga para a UTMify. Nunca lança: a notificação é secundária e não pode
 * interferir na liberação de acesso. Sem UTMIFY_API_TOKEN configurado, não faz nada.
 * `isTest: true` valida o envio na UTMify sem gravar a venda (e sem notificar).
 */
export async function sendPaidSaleToUtmify(
  payment: MercadoPagoPaymentForUtmify,
  customer: UtmifyCustomer,
  options: { isTest?: boolean } = {}
): Promise<UtmifySendResult> {
  const token = process.env.UTMIFY_API_TOKEN;
  if (!token) return { sent: false, reason: "missing_token" };

  try {
    const response = await fetch(UTMIFY_ORDERS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": token },
      body: JSON.stringify({ ...buildPaidOrder(payment, customer), isTest: options.isTest ?? false }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { sent: false, reason: "request_failed", detail: `${response.status} ${await response.text()}` };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: "request_failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
