import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildPaidOrder,
  sendPaidSaleToUtmify,
  toUtmifyDate,
  toUtmifyPaymentMethod,
  type MercadoPagoPaymentForUtmify,
} from "@/lib/utmify/send-sale";

const payment: MercadoPagoPaymentForUtmify = {
  id: 1234567890,
  date_created: "2026-10-02T11:35:13.000-03:00",
  date_approved: "2026-10-02T11:36:02.000-03:00",
  transaction_amount: 129.9,
  payment_type_id: "bank_transfer",
  payment_method_id: "pix",
  fee_details: [{ amount: 1.29 }],
  transaction_details: { net_received_amount: 128.61 },
};

const customer = { name: "Maria Souza", email: "maria@exemplo.com" };

describe("toUtmifyDate", () => {
  it("converte para UTC no formato YYYY-MM-DD HH:MM:SS", () => {
    expect(toUtmifyDate("2026-10-02T11:35:13.000-03:00")).toBe("2026-10-02 14:35:13");
    expect(toUtmifyDate("2026-10-02T23:10:00.000-03:00")).toBe("2026-10-03 02:10:00");
  });
});

describe("toUtmifyPaymentMethod", () => {
  it.each([
    [{ payment_method_id: "pix", payment_type_id: "bank_transfer" }, "pix"],
    [{ payment_method_id: "bolbradesco", payment_type_id: "ticket" }, "boleto"],
    [{ payment_method_id: "visa", payment_type_id: "credit_card" }, "credit_card"],
    [{ payment_method_id: "debvisa", payment_type_id: "debit_card" }, "credit_card"],
    [{ payment_method_id: "account_money", payment_type_id: "account_money" }, "credit_card"],
  ])("mapeia %j para %s", (fields, expected) => {
    expect(toUtmifyPaymentMethod({ ...payment, ...fields })).toBe(expected);
  });
});

describe("buildPaidOrder", () => {
  it("monta o pedido pago com valores em centavos e datas em UTC", () => {
    const order = buildPaidOrder(payment, customer);
    expect(order).toMatchObject({
      orderId: "1234567890",
      platform: "Faturio",
      paymentMethod: "pix",
      status: "paid",
      createdAt: "2026-10-02 14:35:13",
      approvedDate: "2026-10-02 14:36:02",
      refundedAt: null,
      customer: { name: "Maria Souza", email: "maria@exemplo.com", country: "BR" },
      commission: { totalPriceInCents: 12990, gatewayFeeInCents: 129, userCommissionInCents: 12861 },
    });
    expect(order.products).toEqual([
      {
        id: "faturio-acesso",
        name: "Faturio — Acesso completo",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: 12990,
      },
    ]);
    expect(Object.values(order.trackingParameters).every((v) => v === null)).toBe(true);
  });

  it("sem o valor líquido, a comissão é o bruto menos a taxa", () => {
    const order = buildPaidOrder({ ...payment, transaction_details: undefined }, customer);
    expect(order.commission.userCommissionInCents).toBe(12990 - 129);
  });
});

describe("sendPaidSaleToUtmify", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("não faz nada sem UTMIFY_API_TOKEN", async () => {
    vi.stubEnv("UTMIFY_API_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendPaidSaleToUtmify(payment, customer)).toEqual({ sent: false, reason: "missing_token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia para a API de pedidos com o token no header", async () => {
    vi.stubEnv("UTMIFY_API_TOKEN", "token-de-teste");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendPaidSaleToUtmify(payment, customer, { isTest: true })).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.utmify.com.br/api-credentials/orders");
    expect(init.headers["x-api-token"]).toBe("token-de-teste");
    expect(JSON.parse(init.body)).toMatchObject({ orderId: "1234567890", status: "paid", isTest: true });
  });

  it("nunca lança: erro da API ou de rede vira resultado", async () => {
    vi.stubEnv("UTMIFY_API_TOKEN", "token-de-teste");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("API_CREDENTIAL_NOT_FOUND", { status: 404 })));
    expect(await sendPaidSaleToUtmify(payment, customer)).toMatchObject({
      sent: false,
      reason: "request_failed",
      detail: "404 API_CREDENTIAL_NOT_FOUND",
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await sendPaidSaleToUtmify(payment, customer)).toMatchObject({
      sent: false,
      reason: "request_failed",
      detail: "network down",
    });
  });
});
