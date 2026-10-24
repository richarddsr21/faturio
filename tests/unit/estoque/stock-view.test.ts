import { describe, expect, it } from "vitest";
import { sortForStockList, stockComposition, stockPotential, type StockViewProduct } from "@/lib/estoque/stock-view";

const p = (id: string, stockQuantity: number, minimumStock = 0, currentPrice: number | null = 10): StockViewProduct => ({
  id,
  name: id,
  stockQuantity,
  minimumStock,
  currentPrice,
});

describe("stockPotential", () => {
  it("multiplica unidades pelo preço; sem preço vale 0", () => {
    expect(stockPotential({ stockQuantity: 3, currentPrice: 37.81 })).toBeCloseTo(113.43);
    expect(stockPotential({ stockQuantity: 3, currentPrice: null })).toBe(0);
  });
});

describe("stockComposition", () => {
  it("ordena do maior para o menor e calcula a participação", () => {
    const segments = stockComposition([p("colar", 3), p("rr", 99), p("cb", 17)]);
    expect(segments.map((s) => s.key)).toEqual(["rr", "cb", "colar"]);
    expect(segments[0].share).toBeCloseTo(99 / 119);
  });

  it("agrupa em Outros a partir do 6º produto", () => {
    const segments = stockComposition([p("a", 10), p("b", 9), p("c", 8), p("d", 7), p("e", 6), p("f", 5), p("g", 4)]);
    expect(segments).toHaveLength(6);
    expect(segments[5]).toMatchObject({ key: "outros", label: "Outros (2)", units: 9 });
  });

  it("não cria Outros para um produto só", () => {
    const segments = stockComposition([p("a", 10), p("b", 9), p("c", 8), p("d", 7), p("e", 6), p("f", 5)]);
    expect(segments.map((s) => s.key)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("ignora zerados e estoque vazio", () => {
    expect(stockComposition([p("a", 0)])).toEqual([]);
  });
});

describe("sortForStockList", () => {
  it("põe estoque baixo primeiro, o mais crítico no topo, e o resto por nome", () => {
    const sorted = sortForStockList([
      { ...p("Zebra", 50, 5) },
      { ...p("Anel", 4, 5) },
      { ...p("Brinco", 1, 5) },
      { ...p("Colar", 20, 5) },
    ]);
    expect(sorted.map((x) => x.name)).toEqual(["Brinco", "Anel", "Colar", "Zebra"]);
  });
});
