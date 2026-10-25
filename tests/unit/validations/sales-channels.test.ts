import { describe, expect, it } from "vitest";
import {
  channelToFraction,
  channelToPercent,
  salesChannelsFormSchema,
  salesChannelsSchema,
} from "@/lib/validations/sales-channels";

const channel = (name: string, overrides = {}) => ({ name, commission: 0.14, fixedFee: 4, active: true, ...overrides });

describe("salesChannelsSchema", () => {
  it("aceita uma lista válida", () => {
    expect(salesChannelsSchema.safeParse([channel("Shopee"), channel("Pix", { commission: 0, fixedFee: 0 })]).success).toBe(true);
  });

  it("recusa nomes repetidos, ignorando maiúsculas e espaços", () => {
    const result = salesChannelsSchema.safeParse([channel("Shopee"), channel("  shopee ")]);
    expect(result.success).toBe(false);
    expect(result.error!.issues[0]).toMatchObject({ message: "Já existe um canal com esse nome", path: [1, "name"] });
  });

  it("exige ao menos um canal ativo", () => {
    const result = salesChannelsSchema.safeParse([channel("Shopee", { active: false })]);
    expect(result.error!.issues[0].message).toBe("Deixe ao menos um canal ativo para registrar vendas");
  });

  it("comissão em fração precisa ser menor que 100%; taxa fixa não pode ser negativa", () => {
    expect(salesChannelsSchema.safeParse([channel("A", { commission: 1 })]).success).toBe(false);
    expect(salesChannelsSchema.safeParse([channel("A", { fixedFee: -1 })]).success).toBe(false);
  });

  it("nome vazio é recusado", () => {
    expect(salesChannelsSchema.safeParse([channel("   ")]).error!.issues[0].message).toBe("Informe o nome do canal");
  });
});

describe("formulário em percentual", () => {
  it("aceita 14 (%) e converte para fração na ida e na volta", () => {
    const form = salesChannelsFormSchema.safeParse({ channels: [channel("Shopee", { commission: 14 })] });
    expect(form.success).toBe(true);
    expect(channelToFraction(channel("Shopee", { commission: 14 })).commission).toBeCloseTo(0.14, 4);
    expect(channelToPercent(channel("Shopee", { commission: 0.125 })).commission).toBe(12.5);
  });

  it("campo vazio (NaN) mostra mensagem em português", () => {
    const form = salesChannelsFormSchema.safeParse({ channels: [channel("Shopee", { commission: NaN })] });
    expect(form.error!.issues[0].message).toBe("Informe a comissão (use 0 se não tiver)");
  });
});
