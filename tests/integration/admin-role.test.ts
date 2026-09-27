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
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user!.id, name: email, email });
  if (profileError) throw profileError;
  return data.user!;
}

describe("conta admin única", () => {
  const userAEmail = `admin-role-a-${Date.now()}@faturio-test.com`;
  const userBEmail = `admin-role-b-${Date.now()}@faturio-test.com`;
  const password = "senha-teste-12345";

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    userAId = (await createTestUser(userAEmail, password)).id;
    userBId = (await createTestUser(userBEmail, password)).id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("usuário comum não consegue se promover a admin", async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: userAEmail,
      password,
    });
    if (signInError) throw signInError;

    const { error } = await client.from("profiles").update({ role: "admin" }).eq("id", userAId);
    expect(error).not.toBeNull();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userAId)
      .single();
    expect(profile?.role).toBe("user");
  });

  it("usuário comum ainda consegue alterar o próprio nome", async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: userAEmail,
      password,
    });
    if (signInError) throw signInError;

    const { error } = await client.from("profiles").update({ name: "Novo nome" }).eq("id", userAId);
    expect(error).toBeNull();
  });

  it("o banco não aceita mais de uma conta admin", async () => {
    // Pode já existir a conta admin real; nesse caso a primeira promoção também falha.
    await admin.from("profiles").update({ role: "admin" }).eq("id", userAId);
    await admin.from("profiles").update({ role: "admin" }).eq("id", userBId);

    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    expect(count).toBe(1);

    const { data: testAdmins } = await admin
      .from("profiles")
      .select("id")
      .in("id", [userAId, userBId])
      .eq("role", "admin");
    expect(testAdmins!.length).toBeLessThanOrEqual(1);
  });
});
