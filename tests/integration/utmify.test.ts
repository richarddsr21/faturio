import { describe, it, expect } from "vitest";
import { sendPaidSaleToUtmify } from "@/lib/utmify/send-sale";

// Envia de verdade para a API da UTMify, mas com isTest: true — a UTMify valida o token e
// todos os campos sem gravar a venda (e sem notificar). Pulado sem UTMIFY_API_TOKEN.
describe.skipIf(!process.env.UTMIFY_API_TOKEN)("UTMify (isTest)", () => {
  it("aceita o token e o pedido montado a partir de um pagamento do Mercado Pago", async () => {
    const now = new Date().toISOString();
    const result = await sendPaidSaleToUtmify(
      {
        id: `teste-${Date.now()}`,
        date_created: now,
        date_approved: now,
        transaction_amount: 129.9,
        payment_type_id: "bank_transfer",
        payment_method_id: "pix",
        fee_details: [{ amount: 1.29 }],
        transaction_details: { net_received_amount: 128.61 },
      },
      { name: "Cliente Teste Faturio", email: "teste@faturio-test.com" },
      { isTest: true }
    );
    expect(result).toEqual({ sent: true });
  });
});
