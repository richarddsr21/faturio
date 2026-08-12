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
          unit_price: 1,
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
