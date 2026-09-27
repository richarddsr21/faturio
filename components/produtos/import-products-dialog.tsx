"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, CircleMinus, Download, FileSpreadsheet, Upload } from "lucide-react";
import { getProductSkus, importProducts } from "@/lib/actions/products";
import {
  buildTemplateCsv,
  parseCsv,
  parseProductRows,
  MAX_IMPORT_ROWS,
  type Cell,
  type ImportRow,
} from "@/lib/produtos/import-products";
import { downloadBlob } from "@/lib/relatorios/download-file";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** CSV salvo pelo Excel em português costuma vir em Windows-1252, não UTF-8. */
async function readCsvText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

async function readTable(file: File): Promise<Cell[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await readCsvText(file));
  if (name.endsWith(".xlsx")) {
    // Carregada só quando a cliente envia um .xlsx, para não pesar a página de produtos.
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown as Cell[][];
  }
  throw new Error("Formato não suportado. Envie um arquivo .xlsx ou .csv.");
}

const statusIcon = {
  ok: <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-label="Pronto" />,
  skip: <CircleMinus className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Será pulado" />,
  error: <CircleAlert className="h-4 w-4 shrink-0 text-destructive" aria-label="Com erro" />,
};

export function ImportProductsDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  function reset() {
    setFileName(null);
    setRows(null);
    setError(null);
    setImported(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (importing) return;
    setOpen(next);
    if (!next) reset();
  }

  function downloadTemplate() {
    downloadBlob(
      new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" }),
      "modelo-produtos-faturio.csv"
    );
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setRows(null);
    setImported(null);
    setFileName(file.name);

    if (file.size > MAX_FILE_BYTES) {
      setError("Arquivo muito grande. O limite é 5 MB.");
      return;
    }

    setReading(true);
    try {
      const [table, skus] = await Promise.all([readTable(file), getProductSkus()]);
      const result = parseProductRows(table, new Set(skus));
      if (result.fatalError) setError(result.fatalError);
      else setRows(result.rows);
    } catch (e) {
      setError(
        e instanceof Error && e.message.startsWith("Formato")
          ? e.message
          : "Não foi possível ler o arquivo. Confira se é uma planilha .xlsx ou .csv válida."
      );
    } finally {
      setReading(false);
    }
  }

  const ready = rows?.filter((r) => r.status === "ok") ?? [];
  const skipped = rows?.filter((r) => r.status === "skip").length ?? 0;
  const withErrors = rows?.filter((r) => r.status === "error").length ?? 0;

  async function handleImport() {
    if (ready.length === 0) return;
    setImporting(true);
    setError(null);
    const result = await importProducts(ready.map((r) => r.values!));
    setImporting(false);
    if (!result.success) {
      setError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setImported(result.imported ?? 0);
    setRows(null);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Importar planilha
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar produtos por planilha</DialogTitle>
            <DialogDescription>
              Cadastre até {MAX_IMPORT_ROWS} produtos de uma vez a partir de um arquivo .xlsx ou .csv.
            </DialogDescription>
          </DialogHeader>

          {imported !== null ? (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <CircleCheck className="h-10 w-10 text-success" />
              <p className="font-medium text-foreground">
                {imported === 1 ? "1 produto importado." : `${imported} produtos importados.`}
              </p>
              <p className="text-sm text-muted-foreground">
                Eles já aparecem na sua lista de produtos.
              </p>
              <DialogFooter className="self-stretch">
                <Button type="button" variant="ghost" onClick={reset}>
                  Importar outra planilha
                </Button>
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <ol className="flex flex-col gap-4 text-sm">
                <li className="flex flex-col gap-2">
                  <p className="font-medium text-foreground">1. Baixe o modelo e preencha</p>
                  <p className="text-muted-foreground">
                    Só <strong>Nome</strong> e <strong>Custo</strong> são obrigatórios. Valores podem
                    ser escritos como 12,50 ou R$ 12,50; a margem em porcentagem (40 ou 40%).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={downloadTemplate}
                    className="self-start"
                  >
                    <Download className="h-4 w-4" />
                    Baixar modelo
                  </Button>
                </li>
                <li className="flex flex-col gap-2">
                  <p className="font-medium text-foreground">2. Envie o arquivo preenchido</p>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-border px-4 py-4 transition-colors hover:bg-muted",
                      (reading || importing) && "pointer-events-none opacity-60"
                    )}
                  >
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {reading ? "Lendo planilha..." : fileName ?? "Escolher arquivo .xlsx ou .csv"}
                    </span>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFile}
                      className="sr-only"
                    />
                  </label>
                </li>
              </ol>

              {error && <Alert variant="destructive">{error}</Alert>}

              {rows && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground">3. Confira antes de importar</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground">
                      {statusIcon.ok} {ready.length} prontos
                    </span>
                    {skipped > 0 && (
                      <span className="flex items-center gap-1.5 text-foreground">
                        {statusIcon.skip} {skipped} já cadastrados (serão pulados)
                      </span>
                    )}
                    {withErrors > 0 && (
                      <span className="flex items-center gap-1.5 text-foreground">
                        {statusIcon.error} {withErrors} com erro (serão ignorados)
                      </span>
                    )}
                  </div>
                  <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-[10px] border border-border">
                    {rows.map((row) => (
                      <li key={row.line} className="flex items-start gap-3 px-3 py-2">
                        <span className="mt-0.5">{statusIcon[row.status]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            <span className="tabular-nums text-muted-foreground">Linha {row.line} · </span>
                            {row.name || "(sem nome)"}
                          </p>
                          {row.messages.map((message) => (
                            <p
                              key={message}
                              className={cn(
                                "text-xs",
                                row.status === "error" ? "text-destructive" : "text-muted-foreground"
                              )}
                            >
                              {message}
                            </p>
                          ))}
                        </div>
                        {row.values && (
                          <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                            {formatCurrency(row.values.cost)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <DialogFooter className="mt-0">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={importing}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!rows || ready.length === 0 || importing}
                  onClick={handleImport}
                >
                  {importing
                    ? "Importando..."
                    : ready.length > 0
                      ? `Importar ${ready.length} ${ready.length === 1 ? "produto" : "produtos"}`
                      : "Importar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
