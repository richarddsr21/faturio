import { describe, it, expect } from "vitest";
import {
  conversionByMonth,
  customersNeedingAttention,
  lastMonths,
  monthKeyOf,
  sumByMonth,
  type AttentionCandidate,
} from "@/lib/admin/metrics";

describe("monthKeyOf", () => {
  it("usa o fuso de São Paulo na virada do mês", () => {
    // 01/10 02:00 UTC ainda é 30/09 23:00 em São Paulo
    expect(monthKeyOf("2026-10-01T02:00:00Z")).toBe("2026-09");
    expect(monthKeyOf("2026-10-01T04:00:00Z")).toBe("2026-10");
  });
});

describe("lastMonths", () => {
  it("retorna os meses em ordem, atravessando a virada do ano", () => {
    const months = lastMonths(new Date("2026-02-10T12:00:00Z"), 4);
    expect(months).toEqual([
      { key: "2025-11", label: "nov/25" },
      { key: "2025-12", label: "dez/25" },
      { key: "2026-01", label: "jan/26" },
      { key: "2026-02", label: "fev/26" },
    ]);
  });
});

describe("sumByMonth", () => {
  const months = lastMonths(new Date("2026-09-20T12:00:00Z"), 2);

  it("conta itens por mês e ignora datas nulas ou fora do intervalo", () => {
    const items = [
      { at: "2026-08-05T12:00:00Z" },
      { at: "2026-09-01T12:00:00Z" },
      { at: "2026-09-30T12:00:00Z" },
      { at: "2026-01-01T12:00:00Z" },
      { at: null },
    ];
    expect(sumByMonth(items, months, (i) => i.at)).toEqual([
      { label: "ago/26", value: 1 },
      { label: "set/26", value: 2 },
    ]);
  });

  it("soma valores quando valueOf é informado", () => {
    const items = [
      { at: "2026-09-02T12:00:00Z", amount: 129.9 },
      { at: "2026-09-03T12:00:00Z", amount: 0 },
    ];
    expect(sumByMonth(items, months, (i) => i.at, (i) => i.amount)).toEqual([
      { label: "ago/26", value: 0 },
      { label: "set/26", value: 129.9 },
    ]);
  });
});

describe("conversionByMonth", () => {
  it("calcula pagos/criados em % e vale 0 em mês sem checkout", () => {
    const created = [
      { label: "ago/26", value: 0 },
      { label: "set/26", value: 3 },
    ];
    const paid = [
      { label: "ago/26", value: 0 },
      { label: "set/26", value: 2 },
    ];
    expect(conversionByMonth(created, paid)).toEqual([
      { label: "ago/26", value: 0 },
      { label: "set/26", value: 66.7 },
    ]);
  });
});

describe("customersNeedingAttention", () => {
  const now = new Date("2026-09-27T12:00:00Z");
  const base: AttentionCandidate = {
    id: "x",
    name: "Cliente",
    email: "c@x.com",
    hasActiveAccess: true,
    lastSignInAt: "2026-09-20T12:00:00Z",
    onboardingCompleted: true,
  };

  it("ignora clientes sem acesso ativo e clientes em dia", () => {
    const result = customersNeedingAttention(
      [
        { ...base, id: "ok" },
        { ...base, id: "sem-acesso", hasActiveAccess: false, lastSignInAt: null },
      ],
      now
    );
    expect(result).toEqual([]);
  });

  it("classifica pelo motivo mais urgente e ordena por urgência", () => {
    const result = customersNeedingAttention(
      [
        { ...base, id: "inativo", lastSignInAt: "2026-08-01T12:00:00Z" },
        { ...base, id: "onboarding", onboardingCompleted: false },
        // nunca entrou: também não concluiu o onboarding, mas aparece só uma vez
        { ...base, id: "nunca", lastSignInAt: null, onboardingCompleted: false },
      ],
      now
    );
    expect(result.map((r) => [r.id, r.reason])).toEqual([
      ["nunca", "never_logged_in"],
      ["onboarding", "onboarding_pending"],
      ["inativo", "inactive"],
    ]);
  });

  it("login exatamente dentro dos 30 dias não conta como inativo", () => {
    const result = customersNeedingAttention(
      [{ ...base, lastSignInAt: "2026-08-28T13:00:00Z" }],
      now
    );
    expect(result).toEqual([]);
  });
});
