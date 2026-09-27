import { describe, it, expect } from "vitest";
import {
  buildTemplateCsv,
  normalizeHeader,
  parseBrazilianNumber,
  parseCsv,
  parseMargin,
  parseProductRows,
  MAX_IMPORT_ROWS,
  type Cell,
} from "@/lib/produtos/import-products";

describe("parseBrazilianNumber", () => {
  it.each([
    ["12,50", 12.5],
    ["R$ 1.234,56", 1234.56],
    ["1.234", 1234],
    ["12.5", 12.5],
    [" 7 ", 7],
    ["-3,2", -3.2],
  ])("interpreta %j como %d", (input, expected) => {
    expect(parseBrazilianNumber(input)).toBe(expected);
  });

  it("mantém números vindos do Excel", () => {
    expect(parseBrazilianNumber(19.9)).toBe(19.9);
  });

  it("retorna null para vazio e NaN para texto", () => {
    expect(parseBrazilianNumber("")).toBeNull();
    expect(parseBrazilianNumber(null)).toBeNull();
    expect(parseBrazilianNumber("abc")).toBeNaN();
  });
});

describe("parseMargin", () => {
  it("converte percentual em fração", () => {
    expect(parseMargin("40")).toBe(0.4);
    expect(parseMargin("40%")).toBe(0.4);
    expect(parseMargin("12,5%")).toBe(0.125);
    expect(parseMargin(150)).toBe(1.5);
  });

  it("aceita célula do Excel formatada como porcentagem (0,4 = 40%)", () => {
    expect(parseMargin(0.4)).toBe(0.4);
  });

  it("vazio continua vazio", () => {
    expect(parseMargin("")).toBeNull();
  });
});

describe("normalizeHeader", () => {
  it("ignora acentos, maiúsculas, asterisco e sufixo entre parênteses", () => {
    expect(normalizeHeader(" Preço de Venda* ")).toBe("preco de venda");
    expect(normalizeHeader("Margem desejada (%)")).toBe("margem desejada");
    expect(normalizeHeader("Estoque mínimo")).toBe("estoque minimo");
  });
});

describe("parseCsv", () => {
  it("detecta ; e trata aspas, aspas escapadas e quebras de linha", () => {
    const csv = '﻿Nome;Custo\r\n"Caneca ""premium""; azul";12,50\r\n"Linha\nquebrada";3\r\n';
    expect(parseCsv(csv)).toEqual([
      ["Nome", "Custo"],
      ['Caneca "premium"; azul', "12,50"],
      ["Linha\nquebrada", "3"],
    ]);
  });

  it("aceita vírgula como separador", () => {
    expect(parseCsv("Nome,Custo\nCaneca,12.5")).toEqual([
      ["Nome", "Custo"],
      ["Caneca", "12.5"],
    ]);
  });

  it("o modelo gerado é lido de volta sem erros", () => {
    const { rows, fatalError } = parseProductRows(parseCsv(buildTemplateCsv()), new Set());
    expect(fatalError).toBeUndefined();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ok");
    expect(rows[0].values).toMatchObject({
      name: "Camiseta básica preta",
      cost: 25.9,
      sku: "CAM-PRETA-M",
      entryShipping: 2.5,
      currentPrice: 59.9,
      desiredMargin: 0.4,
      initialStock: 20,
      minimumStock: 5,
    });
  });
});

describe("parseProductRows", () => {
  const header: Cell[] = ["Nome*", "Custo*", "SKU", "Estoque inicial"];

  it("recusa planilha sem as colunas obrigatórias", () => {
    const result = parseProductRows([["Nome", "Preço"], ["Caneca", "10"]], new Set());
    expect(result.fatalError).toContain("Custo");
  });

  it("recusa planilha vazia ou só com cabeçalho", () => {
    expect(parseProductRows([], new Set()).fatalError).toBeDefined();
    expect(parseProductRows([header, [null, "", undefined]], new Set()).fatalError).toBeDefined();
  });

  it(`recusa mais de ${MAX_IMPORT_ROWS} produtos`, () => {
    const table: Cell[][] = [header, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [`P${i}`, 1])];
    expect(parseProductRows(table, new Set()).fatalError).toContain(String(MAX_IMPORT_ROWS));
  });

  it("marca erros por linha, ignorando linhas em branco e contando a linha da planilha", () => {
    const table: Cell[][] = [
      header,
      ["Caneca", "10,00", "", "5"],
      [null, null, null, null],
      ["", "abc", "", "2,5"],
      ["Copo", "-1", "", ""],
    ];
    const { rows } = parseProductRows(table, new Set());
    expect(rows.map((r) => [r.line, r.status])).toEqual([
      [2, "ok"],
      [4, "error"],
      [5, "error"],
    ]);
    expect(rows[1].messages).toEqual([
      "Nome é obrigatório.",
      "Custo não é um número válido.",
      "Estoque inicial precisa ser um número inteiro.",
    ]);
    expect(rows[2].messages).toEqual(["Custo não pode ser negativo."]);
  });

  it("pula SKU já cadastrado e acusa SKU repetido dentro da planilha", () => {
    const table: Cell[][] = [
      header,
      ["Caneca", 10, "CAN-01", 1],
      ["Copo", 8, " can-01 ", 1],
      ["Prato", 12, "PRA-01", 1],
    ];
    const { rows } = parseProductRows(table, new Set(["pra-01"]));
    expect(rows.map((r) => r.status)).toEqual(["ok", "error", "skip"]);
    expect(rows[1].messages[0]).toContain("linha 2");
    expect(rows[1].name).toBe("Copo");
  });

  it("aplica os valores padrão dos campos opcionais", () => {
    const { rows } = parseProductRows([["Nome", "Custo"], ["Caneca", "10"]], new Set());
    expect(rows[0].values).toEqual({
      name: "Caneca",
      cost: 10,
      sku: undefined,
      category: undefined,
      supplier: undefined,
      entryShipping: 0,
      currentPrice: undefined,
      desiredMargin: undefined,
      initialStock: 0,
      minimumStock: 0,
    });
  });
});
