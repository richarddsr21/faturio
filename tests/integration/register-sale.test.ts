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

  it("grava o nome do cliente sem espaços nas pontas, e vazio vira null", async () => {
    const client = await signInAs(userEmail, password);
    const { data: namedSaleId, error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 1, unit_price: 50 }],
      p_payment_method: "pix",
      p_customer_name: "  Maria Souza  ",
    });
    expect(error).toBeNull();

    const { data: blankSaleId } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 1, unit_price: 50 }],
      p_payment_method: "pix",
      p_customer_name: "   ",
    });

    const { data: sales } = await admin
      .from("sales")
      .select("id, customer_name")
      .in("id", [namedSaleId, blankSaleId]);
    const byId = Object.fromEntries(sales!.map((s) => [s.id, s.customer_name]));
    expect(byId[namedSaleId]).toBe("Maria Souza");
    expect(byId[blankSaleId]).toBeNull();
  });

  async function channelId(ownerId: string, slug: string) {
    const { data } = await admin
      .from("sales_channels")
      .select("id")
      .eq("user_id", ownerId)
      .eq("slug", slug)
      .single();
    return data!.id as string;
  }

  it("cria os canais padrão junto com as configurações; a loja física herda a taxa de cartão", async () => {
    const { data: channels } = await admin
      .from("sales_channels")
      .select("slug, commission, fixed_fee, active")
      .eq("user_id", userId)
      .order("position");
    expect(channels!.map((c) => c.slug)).toEqual([
      "shopee",
      "mercado_livre",
      "tiktok_shop",
      "instagram_whatsapp",
      "loja_fisica",
      "pix",
    ]);
    const bySlug = Object.fromEntries(channels!.map((c) => [c.slug, Number(c.commission)]));
    expect(bySlug.loja_fisica).toBeCloseTo(0.03, 4);
    expect(bySlug.shopee).toBe(0);
    expect(channels!.every((c) => c.active && Number(c.fixed_fee) === 0)).toBe(true);
  });

  it("com canal, a comissão substitui a taxa de cartão e a taxa fixa conta por peça", async () => {
    const shopeeId = await channelId(userId, "shopee");
    await admin.from("sales_channels").update({ commission: 0.14, fixed_fee: 4 }).eq("id", shopeeId);

    const client = await signInAs(userEmail, password);
    const { data: saleId, error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 2, unit_price: 50 }],
      p_payment_method: "pix",
      p_channel_id: shopeeId,
    });
    expect(error).toBeNull();

    const { data: sale } = await admin
      .from("sales")
      .select("channel_id, gross_revenue, fees, net_profit")
      .eq("id", saleId)
      .single();
    // R$ 100 × (5% adm + 14% Shopee) + 2 peças × R$ 4 = R$ 27 (sem os 3% de cartão)
    expect(sale!.channel_id).toBe(shopeeId);
    expect(Number(sale!.gross_revenue)).toBeCloseTo(100, 2);
    expect(Number(sale!.fees)).toBeCloseTo(27, 2);
    // 2 × (50 − 20) − 27 de taxas − 5 de frete − 2 de embalagem
    expect(Number(sale!.net_profit)).toBeCloseTo(26, 2);
  });

  it("rejeita canal de outro usuário sem mexer no estoque", async () => {
    const otherChannelId = await channelId(otherUserId, "shopee");
    const { data: before } = await admin.from("products").select("stock_quantity").eq("id", productId).single();

    const client = await signInAs(userEmail, password);
    const { error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 1, unit_price: 50 }],
      p_payment_method: "pix",
      p_channel_id: otherChannelId,
    });
    expect(error).not.toBeNull();

    const { data: after } = await admin.from("products").select("stock_quantity").eq("id", productId).single();
    expect(after!.stock_quantity).toBe(before!.stock_quantity);
  });

  it("rejeita canal inativo", async () => {
    const pixId = await channelId(userId, "pix");
    await admin.from("sales_channels").update({ active: false }).eq("id", pixId);

    const client = await signInAs(userEmail, password);
    const { error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 1, unit_price: 50 }],
      p_payment_method: "pix",
      p_channel_id: pixId,
    });
    expect(error?.message).toContain("Canal de venda");
  });

  it("um usuário não lê nem altera os canais de outro (RLS)", async () => {
    const shopeeId = await channelId(userId, "shopee");
    const otherClient = await signInAs(otherUserEmail, password);

    const { data: visible } = await otherClient.from("sales_channels").select("id").eq("id", shopeeId);
    expect(visible).toEqual([]);

    await otherClient.from("sales_channels").update({ commission: 0.5 }).eq("id", shopeeId);
    const { data: channel } = await admin.from("sales_channels").select("commission").eq("id", shopeeId).single();
    expect(Number(channel!.commission)).toBeCloseTo(0.14, 4);

    const { error: insertError } = await otherClient
      .from("sales_channels")
      .insert({ user_id: userId, name: "Canal intruso" });
    expect(insertError).not.toBeNull();
  });
});
