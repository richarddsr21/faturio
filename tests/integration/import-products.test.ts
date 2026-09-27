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

function product(overrides: Record<string, unknown> = {}) {
  return {
    name: "Caneca",
    sku: null,
    category: null,
    supplier: null,
    cost: 10,
    entry_shipping: 0,
    current_price: null,
    desired_margin: null,
    initial_stock: 0,
    minimum_stock: 0,
    ...overrides,
  };
}

describe("import_products (importação por planilha)", () => {
  const userAEmail = `import-a-${Date.now()}@faturio-test.com`;
  const userBEmail = `import-b-${Date.now()}@faturio-test.com`;
  const password = "senha-teste-12345";

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    userAId = (await createTestUser(userAEmail, password)).id;
    userBId = (await createTestUser(userBEmail, password)).id;

    // O User B já tem um produto com o SKU "SKU-B" — não pode afetar o User A.
    const { error } = await admin
      .from("products")
      .insert({ user_id: userBId, name: "Produto B", sku: "SKU-B", cost: 5 });
    if (error) throw error;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("cria os produtos no tenant da sessão, com a movimentação de estoque inicial", async () => {
    const clientA = await signInAs(userAEmail, password);
    const { data, error } = await clientA.rpc("import_products", {
      p_products: [
        product({ name: "Caneca", sku: "SKU-B", initial_stock: 7, desired_margin: 0.4 }),
        product({ name: "Copo", sku: "COPO-1" }),
      ],
    });
    expect(error).toBeNull();
    expect(data).toBe(2);

    const { data: products } = await admin
      .from("products")
      .select("id, user_id, name, stock_quantity, desired_margin")
      .eq("user_id", userAId)
      .order("name");
    expect(products!.map((p) => p.name)).toEqual(["Caneca", "Copo"]);
    expect(products![0]).toMatchObject({ stock_quantity: 7, desired_margin: 0.4 });

    const { data: movements } = await admin
      .from("inventory_movements")
      .select("product_id, type, quantity")
      .eq("user_id", userAId);
    expect(movements).toEqual([{ product_id: products![0].id, type: "initial", quantity: 7 }]);
  });

  it("pula SKUs que o próprio usuário já cadastrou (sem diferenciar maiúsculas)", async () => {
    const clientA = await signInAs(userAEmail, password);
    const { data, error } = await clientA.rpc("import_products", {
      p_products: [product({ name: "Copo repetido", sku: " copo-1 " }), product({ name: "Prato" })],
    });
    expect(error).toBeNull();
    expect(data).toBe(1);

    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userAId);
    expect(count).toBe(3);
  });

  it("é tudo ou nada: uma linha inválida desfaz a importação inteira", async () => {
    const clientA = await signInAs(userAEmail, password);
    const { error } = await clientA.rpc("import_products", {
      p_products: [product({ name: "Válido" }), product({ name: "Inválido", cost: -1 })],
    });
    expect(error).not.toBeNull();

    const { data } = await admin.from("products").select("id").eq("user_id", userAId).eq("name", "Válido");
    expect(data).toEqual([]);
  });

  it("não mexe nos produtos de outro tenant", async () => {
    const { data } = await admin.from("products").select("name").eq("user_id", userBId);
    expect(data).toEqual([{ name: "Produto B" }]);
  });

  it("recusa chamada sem sessão", async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error } = await anon.rpc("import_products", { p_products: [product()] });
    expect(error).not.toBeNull();
  });
});
