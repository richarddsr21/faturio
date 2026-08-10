import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { processPayment } from "@/lib/mercadopago/process-payment";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

describe("processPayment — idempotência do webhook", () => {
  const email = `webhook-test-${Date.now()}@faturio-test.com`;
  let checkoutId: string;
  let createdUserId: string | undefined;

  beforeAll(async () => {
    const { data } = await admin
      .from("pending_checkouts")
      .insert({ name: "Cliente Teste", email })
      .select()
      .single();
    checkoutId = data!.id;
  });

  afterAll(async () => {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    await admin.from("pending_checkouts").delete().eq("id", checkoutId);
  });

  it("processa o pagamento aprovado uma vez e cria a assinatura", async () => {
    const result = await processPayment({
      id: "payment-123",
      status: "approved",
      externalReference: checkoutId,
    });
    expect(result.created).toBe(true);
    createdUserId = result.userId;

    const { data: subs } = await admin
      .from("subscriptions")
      .select()
      .eq("mercadopago_payment_id", "payment-123");
    expect(subs).toHaveLength(1);
  });

  it("processar o mesmo payment_id de novo não duplica a assinatura", async () => {
    const result = await processPayment({
      id: "payment-123",
      status: "approved",
      externalReference: checkoutId,
    });
    expect(result.created).toBe(false);
    expect(result.reason).toBe("already_processed");

    const { data: subs } = await admin
      .from("subscriptions")
      .select()
      .eq("mercadopago_payment_id", "payment-123");
    expect(subs).toHaveLength(1);
  });
});
