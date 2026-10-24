import { describe, expect, it } from "vitest";
import { catalogCategories, catalogSummary, productInitials, productMargin } from "@/lib/produtos/catalog";

describe("productMargin", () => {
  it("calcula a margem sobre o preço", () => {
    expect(productMargin(25.9, 59.9)).toBeCloseTo(0.5676, 4);
  });

  it("sem preço não há margem", () => {
    expect(productMargin(10, null)).toBeNull();
    expect(productMargin(10, 0)).toBeNull();
  });

  it("preço abaixo do custo dá margem negativa", () => {
    expect(productMargin(20, 10)).toBeCloseTo(-1);
  });
});

describe("catalogSummary", () => {
  it("bate com os números da referência do design", () => {
    const summary = catalogSummary([
      { category: "Roupas", cost: 25.9, currentPrice: 59.9, stockQuantity: 17 },
      { category: "Colar", cost: 18.9, currentPrice: 37.81, stockQuantity: 3 },
      { category: "Cozinha", cost: 37, currentPrice: 119.9, stockQuantity: 99 },
    ]);
    expect(summary.activeCount).toBe(3);
    expect(summary.units).toBe(119);
    expect(summary.stockValue).toBeCloseTo(13001.83, 2);
    expect(summary.averageMargin).toBeCloseTo(0.586, 3);
  });

  it("ignora produtos sem preço na margem média", () => {
    const summary = catalogSummary([
      { category: null, cost: 10, currentPrice: null, stockQuantity: 5 },
      { category: null, cost: 10, currentPrice: 20, stockQuantity: 1 },
    ]);
    expect(summary.averageMargin).toBeCloseTo(0.5);
    expect(summary.stockValue).toBe(20);
  });

  it("catálogo vazio", () => {
    expect(catalogSummary([])).toEqual({ activeCount: 0, units: 0, stockValue: 0, averageMargin: null });
  });
});

describe("catalogCategories", () => {
  it("lista categorias distintas em ordem, sem vazias e sem repetir por caixa", () => {
    expect(
      catalogCategories([
        { category: "Roupas" },
        { category: "colar" },
        { category: "Colar" },
        { category: null },
        { category: "  " },
        { category: "Cozinha" },
      ])
    ).toEqual(["colar", "Cozinha", "Roupas"]);
  });
});

describe("productInitials", () => {
  it("usa as iniciais das duas primeiras palavras", () => {
    expect(productInitials("Camiseta básica preta")).toBe("CB");
    expect(productInitials("richard reis")).toBe("RR");
  });

  it("uma palavra usa as duas primeiras letras", () => {
    expect(productInitials("Colar")).toBe("CO");
  });
});
