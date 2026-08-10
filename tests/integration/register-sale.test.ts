import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTestUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!;
}

async function signInAs(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe("register_sale (função Postgres)", () => {
  const userEmail = `register-sale-${Date.now()}@faturio-test.com`;
  const otherUserEmail = `register-sale-other-${Date.now()}@faturio-test.com`;
  const password = "senha-teste-12345";

  let userId: string;
  let otherUserId: string;
  let productId: string;
  let otherProductId: string;

  beforeAll(async () => {
    const user = await createTestUser(userEmail, password);
    const otherUser = await createTestUser(otherUserEmail, password);
    userId = user.id;
    otherUserId = otherUser.id;

    await admin.from("settings").insert({
      user_id: userId,
      packaging_cost: 2,
      shipping_cost: 5,
      gift_cost: 0,
      traffic_cost: 0,
      admin_fee: 0.05,
      card_fee: 0.03,
      desired_margin: 0.2,
    });
    await admin.from("settings").insert({ user_id: otherUserId });

    const { data: product } = await admin
      .from("products")
      .insert({ user_id: userId, name: "Produto Venda A", cost: 20, stock_quantity: 10 })
      .select()
      .single();
    productId = product!.id;

    const { data: otherProduct } = await admin
      .from("products")
      .insert({ user_id: otherUserId, name: "Produto Venda B", cost: 10, stock_quantity: 10 })
      .select()
      .single();
    otherProductId = otherProduct!.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
    await admin.auth.admin.deleteUser(otherUserId);
  });

  it("registra a venda, decrementa o estoque e calcula o lucro corretamente", async () => {
    const client = await signInAs(userEmail, password);
    const { data: saleId, error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 3, unit_price: 50 }],
      p_payment_method: "pix",
      p_discount: 0,
    });

    expect(error).toBeNull();
    expect(saleId).toBeTruthy();

    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();
    expect(product!.stock_quantity).toBe(7);

    const { data: saleItems } = await admin.from("sale_items").select().eq("sale_id", saleId);
    expect(saleItems).toHaveLength(1);
    expect(Number(saleItems![0].profit)).toBeCloseTo(3 * (50 - 20), 2);

    const { data: movements } = await admin
      .from("inventory_movements")
      .select()
      .eq("product_id", productId)
      .eq("type", "sale");
    expect(movements).toHaveLength(1);
    expect(movements![0].quantity).toBe(-3);
  });

  it("rejeita a venda quando o estoque é insuficiente e não altera o estoque", async () => {
    const client = await signInAs(userEmail, password);
    const { error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 1000, unit_price: 50 }],
      p_payment_method: "pix",
      p_discount: 0,
    });

    expect(error).not.toBeNull();

    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();
    expect(product!.stock_quantity).toBe(7);
  });

  it("impede registrar venda usando produto de outro usuário", async () => {
    const client = await signInAs(userEmail, password);
    const { error } = await client.rpc("register_sale", {
      p_items: [{ product_id: otherProductId, quantity: 1, unit_price: 50 }],
      p_payment_method: "pix",
      p_discount: 0,
    });

    expect(error).not.toBeNull();

    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", otherProductId)
      .single();
    expect(product!.stock_quantity).toBe(10);
  });
});
