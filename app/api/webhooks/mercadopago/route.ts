import { NextRequest, NextResponse, after } from "next/server";
import crypto from "node:crypto";
import { processPayment } from "@/lib/mercadopago/process-payment";
import { applyAuthorizedPayment, syncPreapproval } from "@/lib/mercadopago/process-subscription";
import { getMercadoPagoAuthorizedPayment, getMercadoPagoPreapproval } from "@/lib/mercadopago/client";
import { sendPaidSaleToUtmify } from "@/lib/utmify/send-sale";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_NAMES, type RecurringPlan } from "@/lib/plans";

function verifySignature(request: NextRequest, dataId: string): boolean {
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(manifest)
    .digest("hex");

  const hashBuffer = Buffer.from(hash);
  const expectedBuffer = Buffer.from(expectedHash);
  if (hashBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
}

const MINIMUM_AMOUNT = 129.9;
const EXPECTED_CURRENCY = "BRL";

const SUBSCRIPTION_PREAPPROVAL = "subscription_preapproval";
const SUBSCRIPTION_AUTHORIZED_PAYMENT = "subscription_authorized_payment";
const HANDLED_TYPES = new Set(["payment", SUBSCRIPTION_PREAPPROVAL, SUBSCRIPTION_AUTHORIZED_PAYMENT]);

/**
 * Assinatura criada/cancelada (subscription_preapproval) ou cobrança mensal
 * (subscription_authorized_payment). Busca o recurso no Mercado Pago em vez de confiar no
 * corpo da notificação. Erro devolve 500 para o Mercado Pago tentar de novo.
 */
async function handleSubscriptionNotification(type: string, dataId: string) {
  try {
    if (type === SUBSCRIPTION_PREAPPROVAL) {
      const result = await syncPreapproval(await getMercadoPagoPreapproval(dataId));
      if (result.outcome === "invalid_amount") {
        console.error(`[mercadopago-webhook] Assinatura com valor inesperado: preapprovalId=${dataId}`);
      }
      return NextResponse.json({ received: true });
    }

    const authorizedPayment = await getMercadoPagoAuthorizedPayment(dataId);
    const result = await applyAuthorizedPayment(authorizedPayment);
    if (result.outcome === "invalid_amount") {
      console.error(`[mercadopago-webhook] Cobrança com valor inesperado: authorizedPaymentId=${dataId}`);
    }

    // Só a primeira cobrança é a "venda" para a UTMify; as renovações não reenviam.
    const paymentId = authorizedPayment.payment?.id;
    if (result.outcome === "paid" && result.firstPayment && paymentId) {
      const { userId, plan } = result;
      after(() => notifySubscriptionSale(String(paymentId), userId, plan));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[mercadopago-webhook] Erro ao processar assinatura: type=${type}, dataId=${dataId}, mensagem=${errorMessage}`);
    return NextResponse.json({ error: "failed to process subscription" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function notifySubscriptionSale(paymentId: string, userId: string, plan: RecurringPlan) {
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  });
  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!mpResponse.ok || !profile) return;

  const sent = await sendPaidSaleToUtmify(await mpResponse.json(), profile, {
    product: { id: `faturio-${plan}`, name: `Faturio — Plano ${PLAN_NAMES[plan]}` },
  });
  if (!sent.sent && sent.reason === "request_failed") {
    console.error(`[utmify] Falha ao enviar venda: paymentId=${paymentId}, detalhe=${sent.detail}`);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // O Mercado Pago envia notificações de vários tipos (payment, merchant_order,
  // etc.) pra mesma URL. Só processamos as de pagamento e as de assinatura — as outras
  // retornam 200 sem processar, senão o GET do recurso dá 404 e o Mercado Pago fica
  // retentando indefinidamente.
  const notificationType = body?.type ?? (body?.action?.startsWith("payment.") ? "payment" : undefined);
  if (!HANDLED_TYPES.has(notificationType)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const dataId = body?.data?.id;

  if (!dataId) {
    return NextResponse.json({ error: "missing data.id" }, { status: 400 });
  }

  if (!verifySignature(request, String(dataId))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (notificationType !== "payment") {
    return handleSubscriptionNotification(notificationType, String(dataId));
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  });

  if (!mpResponse.ok) {
    return NextResponse.json({ error: "failed to fetch payment" }, { status: 502 });
  }

  const payment = await mpResponse.json();

  // Valida valor e moeda antes de considerar o pagamento aprovado — evita que um
  // pagamento de valor menor (ou em outra moeda) libere acesso completo.
  const isValidAmountAndCurrency =
    payment.transaction_amount >= MINIMUM_AMOUNT && payment.currency_id === EXPECTED_CURRENCY;
  const effectiveStatus = isValidAmountAndCurrency ? payment.status : "rejected";

  try {
    const result = await processPayment({
      id: String(payment.id),
      status: effectiveStatus,
      externalReference: payment.external_reference,
    });

    // Notifica a UTMify só quando o acesso acabou de ser liberado — webhooks repetidos do
    // mesmo pagamento voltam "already_processed" e não reenviam. Roda depois da resposta ao
    // Mercado Pago: uma falha ou lentidão da UTMify não afeta a venda.
    if (result.created && result.customer) {
      const customer = result.customer;
      after(async () => {
        const sent = await sendPaidSaleToUtmify(payment, customer);
        if (!sent.sent && sent.reason === "request_failed") {
          console.error(`[utmify] Falha ao enviar venda: paymentId=${payment.id}, detalhe=${sent.detail}`);
        }
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[mercadopago-webhook] Erro ao processar pagamento: dataId=${dataId}, mensagem=${errorMessage}`);
    return NextResponse.json({ error: "failed to process payment" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
