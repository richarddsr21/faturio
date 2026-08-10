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

export async function POST(request: NextRequest) {
  const body = await request.json();
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

  await processPayment({
    id: String(payment.id),
    status: payment.status,
    externalReference: payment.external_reference,
  });

  return NextResponse.json({ received: true });
}
