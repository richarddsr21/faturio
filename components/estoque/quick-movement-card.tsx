"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { registerStockMovement } from "@/lib/actions/stock";
import { cn } from "@/lib/utils";

type Direction = "entrada" | "saida";

const fieldClass =
  "h-11 w-full rounded-control border-0 bg-primary-foreground px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40";

/** Card "Movimento rápido": entrada ou saída de qualquer produto em um passo. */
export function QuickMovementCard({ products }: { products: { id: string; name: string; stockQuantity: number }[] }) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>("entrada");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const amount = Number(quantity);
    if (!productId) return setError("Escolha o produto.");
    if (!Number.isInteger(amount) || amount <= 0) return setError("Informe uma quantidade inteira maior que zero.");
    const cost = unitCost.trim() === "" ? undefined : Number(unitCost.replace(",", "."));
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) return setError("Custo unitário inválido.");

    setSubmitting(true);
    const result = await registerStockMovement({
      productId,
      // Saída é um ajuste negativo (perda, uso próprio, venda fora do sistema).
      type: direction === "entrada" ? "entry" : "adjustment",
      quantity: direction === "entrada" ? amount : -amount,
      unitCost: direction === "entrada" ? cost : undefined,
      reason: reason.trim() || (direction === "saida" ? "Saída manual" : undefined),
    });
    setSubmitting(false);

    if (!result.success) return setError(result.error ?? "Não foi possível registrar o movimento.");
    const name = products.find((p) => p.id === productId)?.name ?? "produto";
    setNotice(`${direction === "entrada" ? "Entrada" : "Saída"} de ${amount} un. de ${name} registrada.`);
    setQuantity("");
    setUnitCost("");
    setReason("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-card bg-primary p-5 text-primary-foreground shadow-[var(--shadow-button-primary)] sm:p-6"
      aria-labelledby="quick-movement-title"
    >
      <h2 id="quick-movement-title" className="text-lg font-bold">
        Movimento rápido
      </h2>

      <div role="radiogroup" aria-label="Tipo de movimento" className="grid grid-cols-2 gap-1 rounded-control bg-primary-foreground/10 p-1">
        {(["entrada", "saida"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={direction === value}
            onClick={() => setDirection(value)}
            className={cn(
              "h-9 rounded-[10px] text-sm font-semibold transition-colors",
              direction === value ? "bg-primary-foreground text-primary" : "hover:bg-primary-foreground/10"
            )}
          >
            {value === "entrada" ? "Entrada" : "Saída"}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="quick-movement-product" className="mb-1 block text-xs font-semibold">
          Produto
        </label>
        <select
          id="quick-movement-product"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          className={fieldClass}
        >
          <option value="">Selecione</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.stockQuantity} un.
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="quick-movement-quantity" className="mb-1 block text-xs font-semibold">
          Quantidade
        </label>
        <input
          id="quick-movement-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="Ex.: 10"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className={cn(fieldClass, "font-mono placeholder:text-muted-foreground")}
        />
      </div>

      {showDetails ? (
        <div className="grid grid-cols-2 gap-2">
          {direction === "entrada" && (
            <div>
              <label htmlFor="quick-movement-cost" className="mb-1 block text-xs font-semibold">
                Custo unitário
              </label>
              <input
                id="quick-movement-cost"
                inputMode="decimal"
                placeholder="R$"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className={cn(fieldClass, "font-mono placeholder:text-muted-foreground")}
              />
            </div>
          )}
          <div className={direction === "entrada" ? "" : "col-span-2"}>
            <label htmlFor="quick-movement-reason" className="mb-1 block text-xs font-semibold">
              Motivo
            </label>
            <input
              id="quick-movement-reason"
              placeholder={direction === "entrada" ? "Ex.: compra" : "Ex.: avaria"}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={cn(fieldClass, "placeholder:text-muted-foreground")}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="self-start text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Adicionar custo ou motivo
        </button>
      )}

      <button
        type="submit"
        disabled={submitting || products.length === 0}
        className="mt-1 h-11 rounded-control bg-primary-foreground text-sm font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Registrando..." : "Registrar movimento"}
      </button>

      <div aria-live="polite" className="empty:hidden">
        {error && <p className="text-sm font-semibold">{error}</p>}
        {notice && (
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
      </div>
    </form>
  );
}
