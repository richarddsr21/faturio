import { describe, expect, it } from "vitest";
import { isLowStock } from "@/lib/finance/stock";

describe("isLowStock", () => {
  it("alerta quando o estoque está abaixo do mínimo", () => {
    expect(isLowStock(2, 3)).toBe(true);
  });

  it("alerta quando o estoque é igual ao mínimo", () => {
    expect(isLowStock(3, 3)).toBe(true);
  });

  it("não alerta quando o estoque está acima do mínimo", () => {
    expect(isLowStock(4, 3)).toBe(false);
  });

  it("não alerta produto sem mínimo definido, mesmo zerado", () => {
    expect(isLowStock(0, 0)).toBe(false);
  });
});
