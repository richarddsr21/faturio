import { describe, expect, it } from "vitest";
import {
  effectivePlan,
  expectedMonthlyPrice,
  FEATURE_PLANS,
  grantsAccess,
  hasFeature,
  sameAmount,
  statusAfterUnblock,
  type Feature,
  type SubscriptionAccessRow,
} from "@/lib/plans";

const now = new Date("2026-10-25T12:00:00Z");
const future = "2026-11-25T12:00:00Z";
const past = "2026-10-24T12:00:00Z";

const lifetime: SubscriptionAccessRow = { plan: "lifetime", status: "active", current_period_end: null };
const monthly = (plan: SubscriptionAccessRow["plan"], status: string, end: string | null): SubscriptionAccessRow => ({
  plan,
  status,
  current_period_end: end,
});

describe("hasFeature", () => {
  const features = Object.keys(FEATURE_PLANS) as Feature[];

  it("todos os recursos que existem hoje são do basic e valem em todos os planos", () => {
    for (const feature of features) {
      expect(hasFeature("basic", feature)).toBe(true);
      expect(hasFeature("lifetime", feature)).toBe(true);
      expect(hasFeature("pro", feature)).toBe(true);
      expect(hasFeature("premium", feature)).toBe(true);
    }
  });

  it("sem plano não tem nenhum recurso", () => {
    for (const feature of features) expect(hasFeature(null, feature)).toBe(false);
  });
});

describe("grantsAccess", () => {
  it("vitalício ativo dá acesso sem data de expiração", () => {
    expect(grantsAccess(lifetime, now)).toBe(true);
  });

  it("vitalício bloqueado pelo admin não dá acesso", () => {
    expect(grantsAccess({ ...lifetime, status: "blocked" }, now)).toBe(false);
  });

  it("mensal active, past_due ou cancelled dá acesso até o fim do período pago", () => {
    for (const status of ["active", "past_due", "cancelled"]) {
      expect(grantsAccess(monthly("pro", status, future), now)).toBe(true);
      expect(grantsAccess(monthly("pro", status, past), now)).toBe(false);
    }
  });

  it("mensal autorizada sem pagamento (pending), sem período ou bloqueada não dá acesso", () => {
    expect(grantsAccess(monthly("basic", "pending", null), now)).toBe(false);
    expect(grantsAccess(monthly("basic", "active", null), now)).toBe(false);
    expect(grantsAccess(monthly("basic", "blocked", future), now)).toBe(false);
  });
});

describe("effectivePlan", () => {
  it("sem assinatura que dê acesso, null", () => {
    expect(effectivePlan([], now)).toBeNull();
    expect(effectivePlan([monthly("premium", "cancelled", past)], now)).toBeNull();
  });

  it("vitalício com upgrade vale o plano do upgrade enquanto ele estiver pago", () => {
    expect(effectivePlan([lifetime, monthly("pro", "active", future)], now)).toBe("pro");
    expect(effectivePlan([monthly("premium", "past_due", future), lifetime], now)).toBe("premium");
  });

  it("vitalício volta a valer quando o upgrade acaba: nunca perde o acesso", () => {
    expect(effectivePlan([lifetime, monthly("pro", "cancelled", past)], now)).toBe("lifetime");
  });

  it("vale o maior plano entre as assinaturas válidas", () => {
    expect(effectivePlan([monthly("basic", "cancelled", future), monthly("premium", "active", future)], now)).toBe(
      "premium"
    );
  });
});

describe("expectedMonthlyPrice", () => {
  it("preço cheio para quem não é vitalício", () => {
    expect(expectedMonthlyPrice("basic", false)).toBe(29.9);
    expect(expectedMonthlyPrice("pro", false)).toBe(59.9);
    expect(expectedMonthlyPrice("premium", false)).toBe(109.9);
  });

  it("preço de upgrade para o vitalício, que não pode assinar o basic", () => {
    expect(expectedMonthlyPrice("pro", true)).toBe(29.9);
    expect(expectedMonthlyPrice("premium", true)).toBe(79.9);
    expect(expectedMonthlyPrice("basic", true)).toBeNull();
  });
});

describe("sameAmount", () => {
  it("compara centavos, sem erro de ponto flutuante", () => {
    expect(sameAmount(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameAmount(29.9, 29.89)).toBe(false);
  });
});

describe("statusAfterUnblock", () => {
  it("vitalício volta a ter acesso", () => {
    expect(statusAfterUnblock("lifetime")).toBe("active");
  });

  it("mensal volta cancelada: o bloqueio cancelou a cobrança no Mercado Pago", () => {
    expect(statusAfterUnblock("basic")).toBe("cancelled");
    expect(statusAfterUnblock("pro")).toBe("cancelled");
    expect(statusAfterUnblock("premium")).toBe("cancelled");
  });

  it("mensal reativada dá acesso só até o fim do período já pago", () => {
    expect(grantsAccess(monthly("pro", statusAfterUnblock("pro"), future), now)).toBe(true);
    expect(grantsAccess(monthly("pro", statusAfterUnblock("pro"), past), now)).toBe(false);
  });
});
