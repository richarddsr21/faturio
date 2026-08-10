import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "public" },
  global: {
    headers: {
      "X-Client-Info": "rls-test",
    },
  },
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

describe("isolamento multi-tenant (RLS)", () => {
  const userAEmail = `user-a-${Date.now()}@faturio-test.com`;
  const userBEmail = `user-b-${Date.now()}@faturio-test.com`;
  const password = "senha-teste-12345";

  let userAId: string;
  let userBId: string;
  let productAId: string;

  beforeAll(async () => {
    const userA = await createTestUser(userAEmail, password);
    const userB = await createTestUser(userBEmail, password);
    userAId = userA.id;
    userBId = userB.id;

    const { data: productA, error } = await admin
      .from("products")
      .insert({ user_id: userAId, name: "Produto A1", cost: 10, stock_quantity: 5 })
      .select()
      .single();
    if (error) throw error;
    productAId = productA.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("User B não consegue LER o produto do User A", async () => {
    const clientB = await signInAs(userBEmail, password);
    const { data, error } = await clientB.from("products").select().eq("id", productAId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("User B não consegue ATUALIZAR o produto do User A", async () => {
    const clientB = await signInAs(userBEmail, password);
    const { data } = await clientB
      .from("products")
      .update({ name: "Produto Roubado" })
      .eq("id", productAId)
      .select();
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from("products")
      .select()
      .eq("id", productAId)
      .single();
    expect(unchanged!.name).toBe("Produto A1");
  });

  it("User B não consegue EXCLUIR o produto do User A", async () => {
    const clientB = await signInAs(userBEmail, password);
    await clientB.from("products").delete().eq("id", productAId);

    const { data: stillExists } = await admin
      .from("products")
      .select()
      .eq("id", productAId)
      .single();
    expect(stillExists).not.toBeNull();
  });

  it("User A consegue ler o próprio produto normalmente", async () => {
    const clientA = await signInAs(userAEmail, password);
    const { data } = await clientA.from("products").select().eq("id", productAId).single();
    expect(data!.name).toBe("Produto A1");
  });
});
