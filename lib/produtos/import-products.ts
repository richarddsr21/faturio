// Leitura e validação da planilha de importação de produtos. Puro (sem banco, sem DOM) —
// testado em tests/unit/produtos/import-products.test.ts. Quem lê o arquivo (.xlsx/.csv)
// entrega aqui uma matriz de células; a primeira linha não vazia é o cabeçalho.

export const MAX_IMPORT_ROWS = 500;

export type Cell = string | number | boolean | Date | null | undefined;

export interface ImportProductValues {
  name: string;
  cost: number;
  sku?: string;
  category?: string;
  supplier?: string;
  entryShipping: number;
  currentPrice?: number;
  desiredMargin?: number; // fração: 0.4 = 40%
  initialStock: number;
  minimumStock: number;
}

export type ImportRowStatus = "ok" | "skip" | "error";

export interface ImportRow {
  line: number; // linha da planilha (1 = cabeçalho)
  name: string; // como veio na planilha, para identificar a linha mesmo com erro
  status: ImportRowStatus;
  values?: ImportProductValues;
  messages: string[];
}

export interface ParsedImport {
  rows: ImportRow[];
  /** Erro que impede a importação inteira (cabeçalho inválido, arquivo vazio, excesso de linhas). */
  fatalError?: string;
}

type Field = keyof ImportProductValues;

interface ColumnSpec {
  field: Field;
  header: string; // como aparece no modelo
  aliases: string[]; // já normalizados
  required?: boolean;
}

export const IMPORT_COLUMNS: ColumnSpec[] = [
  { field: "name", header: "Nome", aliases: ["nome", "nome do produto", "produto"], required: true },
  { field: "cost", header: "Custo", aliases: ["custo", "custo unitario", "preco de custo"], required: true },
  { field: "sku", header: "SKU", aliases: ["sku", "codigo"] },
  { field: "category", header: "Categoria", aliases: ["categoria"] },
  { field: "supplier", header: "Fornecedor", aliases: ["fornecedor"] },
  { field: "entryShipping", header: "Frete de entrada", aliases: ["frete de entrada", "frete entrada"] },
  { field: "currentPrice", header: "Preço de venda", aliases: ["preco de venda", "preco", "preco atual"] },
  { field: "desiredMargin", header: "Margem desejada (%)", aliases: ["margem desejada", "margem"] },
  { field: "initialStock", header: "Estoque inicial", aliases: ["estoque inicial", "estoque", "quantidade"] },
  { field: "minimumStock", header: "Estoque mínimo", aliases: ["estoque minimo"] },
];

/** Minúsculas, sem acentos, sem "*", sem sufixos entre parênteses e espaços extras. */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSku(value: string): string {
  return value.trim().toLowerCase();
}

function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
}

/**
 * Número no formato brasileiro ou de planilha: 12.5, "12,50", "R$ 1.234,56", "1.234".
 * Retorna null para vazio e NaN para texto que não é número.
 */
export function parseBrazilianNumber(cell: Cell): number | null {
  if (typeof cell === "number") return cell;
  let text = cellText(cell).replace(/R\$/gi, "").replace(/%/g, "").replace(/\s/g, "");
  if (text === "") return null;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
  }
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

/**
 * Margem em fração. "40%", "40" e "40,5" são percentuais. Um número entre 0 e 1 vindo do
 * Excel é uma célula formatada como porcentagem (40% é guardado como 0,4).
 */
export function parseMargin(cell: Cell): number | null {
  const isPercentText = typeof cell === "string" && cell.includes("%");
  const value = parseBrazilianNumber(cell);
  if (value === null || Number.isNaN(value)) return value;
  if (!isPercentText && typeof cell === "number" && value > 0 && value < 1) return value;
  return Math.round((value / 100) * 10000) / 10000;
}

function isEmptyRow(row: Cell[]): boolean {
  return row.every((cell) => cellText(cell) === "");
}

function formatLines(lines: number[]) {
  return lines.length === 1 ? `linha ${lines[0]}` : `linhas ${lines.join(", ")}`;
}

/**
 * Interpreta as linhas da planilha. `existingSkus` são os SKUs já cadastrados pelo usuário
 * (normalizados com normalizeSku): essas linhas ficam como "skip" e não são importadas.
 */
export function parseProductRows(table: Cell[][], existingSkus: Set<string>): ParsedImport {
  const headerIndex = table.findIndex((row) => !isEmptyRow(row));
  if (headerIndex === -1) {
    return { rows: [], fatalError: "A planilha está vazia." };
  }

  const header = table[headerIndex].map((cell) => normalizeHeader(cellText(cell)));
  const columnIndex = new Map<Field, number>();
  for (const spec of IMPORT_COLUMNS) {
    const index = header.findIndex((h) => spec.aliases.includes(h));
    if (index !== -1) columnIndex.set(spec.field, index);
  }

  const missing = IMPORT_COLUMNS.filter((c) => c.required && !columnIndex.has(c.field));
  if (missing.length > 0) {
    return {
      rows: [],
      fatalError: `Coluna obrigatória não encontrada: ${missing.map((c) => c.header).join(", ")}. Use o modelo de planilha.`,
    };
  }

  const dataRows = table
    .map((row, i) => ({ row, line: i + 1 }))
    .slice(headerIndex + 1)
    .filter(({ row }) => !isEmptyRow(row));

  if (dataRows.length === 0) {
    return { rows: [], fatalError: "A planilha não tem nenhum produto abaixo do cabeçalho." };
  }
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      fatalError: `A planilha tem ${dataRows.length} produtos. Importe no máximo ${MAX_IMPORT_ROWS} por vez.`,
    };
  }

  const get = (row: Cell[], field: Field): Cell => {
    const index = columnIndex.get(field);
    return index === undefined ? undefined : row[index];
  };

  const firstLineBySku = new Map<string, number>();
  const rows: ImportRow[] = dataRows.map(({ row, line }) => {
    const errors: string[] = [];

    const name = cellText(get(row, "name"));
    if (!name) errors.push("Nome é obrigatório.");

    const money = (field: Field, label: string, required = false) => {
      const value = parseBrazilianNumber(get(row, field));
      if (value === null) {
        if (required) errors.push(`${label} é obrigatório.`);
        return undefined;
      }
      if (Number.isNaN(value)) errors.push(`${label} não é um número válido.`);
      else if (value < 0) errors.push(`${label} não pode ser negativo.`);
      return Number.isNaN(value) ? undefined : Math.round(value * 100) / 100;
    };

    const integer = (field: Field, label: string) => {
      const value = parseBrazilianNumber(get(row, field));
      if (value === null) return 0;
      if (Number.isNaN(value) || !Number.isInteger(value)) {
        errors.push(`${label} precisa ser um número inteiro.`);
      } else if (value < 0) {
        errors.push(`${label} não pode ser negativo.`);
      }
      return value;
    };

    const cost = money("cost", "Custo", true);
    const entryShipping = money("entryShipping", "Frete de entrada") ?? 0;
    const currentPrice = money("currentPrice", "Preço de venda");
    const initialStock = integer("initialStock", "Estoque inicial");
    const minimumStock = integer("minimumStock", "Estoque mínimo");

    const margin = parseMargin(get(row, "desiredMargin"));
    if (margin !== null && Number.isNaN(margin)) errors.push("Margem desejada não é um número válido.");
    else if (margin !== null && (margin < 0 || margin >= 1000)) {
      errors.push("Margem desejada precisa estar entre 0% e 99.999%.");
    }

    const sku = cellText(get(row, "sku")) || undefined;
    const messages = [...errors];
    let status: ImportRowStatus = errors.length > 0 ? "error" : "ok";

    if (sku) {
      const key = normalizeSku(sku);
      const firstLine = firstLineBySku.get(key);
      if (firstLine !== undefined) {
        status = "error";
        messages.push(`SKU repetido na planilha (já usado na linha ${firstLine}).`);
      } else {
        firstLineBySku.set(key, line);
        if (status === "ok" && existingSkus.has(key)) {
          status = "skip";
          messages.push("SKU já cadastrado — este produto será pulado.");
        }
      }
    }

    if (status === "error") return { line, name, status, messages };

    return {
      line,
      name,
      status,
      messages,
      values: {
        name,
        cost: cost!,
        sku,
        category: cellText(get(row, "category")) || undefined,
        supplier: cellText(get(row, "supplier")) || undefined,
        entryShipping,
        currentPrice,
        desiredMargin: margin ?? undefined,
        initialStock,
        minimumStock,
      },
    };
  });

  return { rows };
}

/** Resumo de erros para mensagens curtas ("3 produtos com erro nas linhas 4, 7, 9"). */
export function describeErrorLines(rows: ImportRow[]): string | null {
  const lines = rows.filter((r) => r.status === "error").map((r) => r.line);
  if (lines.length === 0) return null;
  const shown = lines.slice(0, 5);
  const suffix = lines.length > shown.length ? ` e mais ${lines.length - shown.length}` : "";
  return `${formatLines(shown)}${suffix}`;
}

/**
 * CSV em texto → matriz de células. Aceita ";" (Excel em português) ou "," como separador,
 * aspas com "" escapado e quebras de linha dentro de aspas.
 */
export function parseCsv(text: string): string[][] {
  const content = text.replace(/^﻿/, "");
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Conteúdo do modelo em CSV (";", com BOM para o Excel abrir os acentos corretamente). */
export function buildTemplateCsv(): string {
  const header = IMPORT_COLUMNS.map((c) => (c.required ? `${c.header}*` : c.header));
  const example = [
    "Camiseta básica preta",
    "25,90",
    "CAM-PRETA-M",
    "Roupas",
    "Fornecedor Exemplo",
    "2,50",
    "59,90",
    "40",
    "20",
    "5",
  ];
  return `﻿${header.join(";")}\r\n${example.join(";")}\r\n`;
}
