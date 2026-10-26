export interface MercadoPagoPreference {
  id: string;
  init_point: string;
}

export interface CreatePreferenceInput {
  externalReference: string;
  payerEmail: string;
}

export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<MercadoPagoPreference> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: "Faturio — Acesso completo",
          quantity: 1,
          unit_price: 129.9,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${appUrl}/pagamento/sucesso`,
        pending: `${appUrl}/pagamento/pendente`,
        failure: `${appUrl}/pagamento/recusado`,
      },
      auto_return: "approved",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar preferência no Mercado Pago: ${response.status}`);
  }

  return response.json();
}

// Assinatura recorrente (preapproval sem plano associado): cada checkout cria a sua, com o
// valor decidido no servidor. Notificações chegam como subscription_preapproval (assinatura
// criada/cancelada/pausada) e subscription_authorized_payment (cada cobrança mensal), na
// URL de webhook configurada na aplicação do Mercado Pago.

/** Campos do GET /preapproval/{id} usados aqui. */
export interface MercadoPagoPreapproval {
  id: string;
  /** pending | authorized | paused | cancelled */
  status: string;
  external_reference: string;
  init_point?: string;
  auto_recurring: { transaction_amount: number; currency_id: string };
}

/** Campos do GET /authorized_payments/{id} (cobrança mensal) usados aqui. */
export interface MercadoPagoAuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  /** scheduled | processed | recycling | cancelled */
  status: string;
  transaction_amount: number;
  currency_id: string;
  date_created: string;
  last_modified?: string;
  payment?: { id: number | string; status: string; status_detail?: string } | null;
}

export interface CreatePreapprovalInput {
  externalReference: string;
  payerEmail: string;
  reason: string;
  amount: number;
}

function mercadoPagoHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
  };
}

export async function createMercadoPagoPreapproval(
  input: CreatePreapprovalInput
): Promise<MercadoPagoPreapproval & { init_point: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const response = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: mercadoPagoHeaders(),
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "BRL",
      },
      back_url: `${appUrl}/pagamento/sucesso`,
      status: "pending",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar assinatura no Mercado Pago: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function getMercadoPagoPreapproval(id: string): Promise<MercadoPagoPreapproval> {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    headers: mercadoPagoHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar assinatura no Mercado Pago: ${response.status}`);
  }
  return response.json();
}

export async function getMercadoPagoAuthorizedPayment(id: string): Promise<MercadoPagoAuthorizedPayment> {
  const response = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(id)}`, {
    headers: mercadoPagoHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar cobrança da assinatura no Mercado Pago: ${response.status}`);
  }
  return response.json();
}

export async function cancelMercadoPagoPreapproval(id: string): Promise<void> {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: mercadoPagoHeaders(),
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao cancelar assinatura no Mercado Pago: ${response.status}`);
  }
}
