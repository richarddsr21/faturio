import { describe, expect, it } from "vitest";
import {
  checkoutMonthlyPrice,
  classifyAuthorizedPayment,
  matchesExpectedPrice,
} from "@/lib/mercadopago/process-subscription";

describe("checkoutMonthlyPrice", () => {
  it("cliente novo paga o preço cheio do plano", () => {
    expect(checkoutMonthlyPrice({ plan: "basic", user_id: null })).toBe(29.9);
    expect(checkoutMonthlyPrice({ plan: "pro", user_id: null })).toBe(59.9);
    expect(checkoutMonthlyPrice({ plan: "premium", user_id: null })).toBe(109.9);
  });

  it("vitalício fazendo upgrade (checkout com user_id) paga o preço especial", () => {
    expect(checkoutMonthlyPrice({ plan: "pro", user_id: "u1" })).toBe(29.9);
    expect(checkoutMonthlyPrice({ plan: "premium", user_id: "u1" })).toBe(79.9);
  });

  it("checkout sem plano (compra vitalícia antiga) ou combinação que não existe não tem preço", () => {
    expect(checkoutMonthlyPrice({ plan: null, user_id: null })).toBeNull();
    expect(checkoutMonthlyPrice({ plan: "lifetime", user_id: null })).toBeNull();
    expect(checkoutMonthlyPrice({ plan: "basic", user_id: "u1" })).toBeNull();
  });
});

describe("matchesExpectedPrice", () => {
  it("aceita só o valor exato em reais", () => {
    expect(matchesExpectedPrice(59.9, "BRL", 59.9)).toBe(true);
    // Upgrade do vitalício (29,90) não libera o Pro cheio de 59,90, e vice-versa.
    expect(matchesExpectedPrice(29.9, "BRL", 59.9)).toBe(false);
    expect(matchesExpectedPrice(109.9, "BRL", 79.9)).toBe(false);
  });

  it("recusa outra moeda ou checkout sem preço", () => {
    expect(matchesExpectedPrice(29.9, "USD", 29.9)).toBe(false);
    expect(matchesExpectedPrice(29.9, "BRL", null)).toBe(false);
  });
});

describe("classifyAuthorizedPayment", () => {
  it("cobrança com pagamento aprovado estende o período", () => {
    expect(classifyAuthorizedPayment({ status: "processed", payment: { id: 1, status: "approved" } })).toBe("approved");
  });

  it("cobrança recusada ou em nova tentativa marca pagamento pendente", () => {
    expect(classifyAuthorizedPayment({ status: "recycling", payment: { id: 1, status: "rejected" } })).toBe("failed");
    expect(classifyAuthorizedPayment({ status: "processed", payment: { id: 1, status: "rejected" } })).toBe("failed");
    expect(classifyAuthorizedPayment({ status: "recycling", payment: null })).toBe("failed");
  });

  it("cobrança agendada ou em processamento ainda não muda nada", () => {
    expect(classifyAuthorizedPayment({ status: "scheduled", payment: null })).toBe("ignored");
    expect(classifyAuthorizedPayment({ status: "processed", payment: { id: 1, status: "in_process" } })).toBe("ignored");
  });
});
