import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { processPayment } from "@/lib/mercadopago/process-payment";

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

const MINIMUM_AMOUNT = 5;
const EXPECTED_CURRENCY = "BRL";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // O Mercado Pago envia notificações de vários tipos (payment, merchant_order,
  // etc.) pra mesma URL. Só processamos as de pagamento — as outras retornam
  // 200 sem processar, senão o GET /v1/payments/{id} abaixo dá 404 e o Mercado
  // Pago fica retentando indefinidamente.
  const notificationType = body?.type ?? (body?.action?.startsWith("payment.") ? "payment" : undefined);
  if (notificationType !== "payment") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const dataId = body?.data?.id;

  if (!dataId) {
    return NextResponse.json({ error: "missing data.id" }, { status: 400 });
  }

  if (!verifySignature(request, String(dataId))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
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
    await processPayment({
      id: String(payment.id),
      status: effectiveStatus,
      externalReference: payment.external_reference,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[mercadopago-webhook] Erro ao processar pagamento: dataId=${dataId}, mensagem=${errorMessage}`);
    return NextResponse.json({ error: "failed to process payment" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
