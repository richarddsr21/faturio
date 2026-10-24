"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { upsertGoal } from "@/lib/actions/goals";
import { cn, percentToFraction } from "@/lib/utils";
import { monthNames, monthKey } from "@/lib/metas/goals-view";

export interface ExistingGoal {
  month: number;
  year: number;
  revenueGoal: number;
  desiredMargin: number | null;
}

const fieldClass =
  "h-11 w-full rounded-control border-0 bg-primary-foreground px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Campos em texto (não number) para aceitar "1.500,00" e "1500.5" do jeito que a pessoa digitar.
function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function formatInput(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formulário em destaque da tela de Metas. Ao escolher um mês que já tem meta, os
 * campos são preenchidos para editar (o salvar é um upsert por mês/ano).
 */
export function GoalHeroForm({
  goals,
  defaultMonth,
  defaultYear,
  badge,
}: {
  goals: ExistingGoal[];
  defaultMonth: number;
  defaultYear: number;
  /** Selo do canto (ex.: "Setembro bateu 137,8%"). */
  badge?: { text: string; tone: "hit" | "missed" } | null;
}) {
  const router = useRouter();
  const byKey = new Map(goals.map((g) => [monthKey(g.year, g.month), g]));

  function valuesFor(month: number, year: number) {
    const goal = byKey.get(monthKey(year, month));
    return {
      revenueGoal: goal ? formatInput(goal.revenueGoal) : "",
      desiredMargin:
        goal?.desiredMargin !== null && goal?.desiredMargin !== undefined
          ? (goal.desiredMargin * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
          : "",
    };
  }

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(String(defaultYear));
  const [revenueGoal, setRevenueGoal] = useState(() => valuesFor(defaultMonth, defaultYear).revenueGoal);
  const [desiredMargin, setDesiredMargin] = useState(() => valuesFor(defaultMonth, defaultYear).desiredMargin);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const yearNumber = Number(year);
  const editing = byKey.has(monthKey(yearNumber, month));

  function selectPeriod(nextMonth: number, nextYear: string) {
    setMonth(nextMonth);
    setYear(nextYear);
    setError(null);
    setNotice(null);
    const values = valuesFor(nextMonth, Number(nextYear));
    setRevenueGoal(values.revenueGoal);
    setDesiredMargin(values.desiredMargin);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!Number.isInteger(yearNumber) || yearNumber < 2020 || yearNumber > 2100) return setError("Ano inválido.");
    const goal = parseDecimal(revenueGoal);
    if (goal === null) return setError("Informe a meta de faturamento do mês.");
    if (Number.isNaN(goal) || goal < 0) return setError("Meta inválida.");
    const margin = parseDecimal(desiredMargin);
    if (margin !== null && (Number.isNaN(margin) || margin < 0 || margin >= 100)) {
      return setError("A margem desejada deve ficar entre 0% e 99,99%.");
    }

    setSubmitting(true);
    const result = await upsertGoal({
      month,
      year: yearNumber,
      revenueGoal: goal,
      desiredMargin: margin !== null ? percentToFraction(margin) : undefined,
    });
    setSubmitting(false);
    if (!result.success) return setError(result.error ?? "Não foi possível salvar a meta.");
    setNotice(`Meta de ${monthNames[month - 1]} de ${yearNumber} salva.`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex flex-col gap-5 overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-[var(--shadow-button-primary)] sm:p-7"
      aria-labelledby="goal-form-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {capitalize(monthNames[month - 1])} {Number.isInteger(yearNumber) ? yearNumber : ""}
          </p>
          <h2 id="goal-form-title" className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">
            {editing ? "Ajuste a meta do mês" : "Defina a meta do mês"}
          </h2>
        </div>
        {badge && (
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              badge.tone === "hit" ? "bg-primary-foreground text-primary" : "bg-primary-foreground/10"
            )}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.1fr_0.8fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="goal-month" className="mb-1 block text-xs font-semibold">
            Mês
          </label>
          <select
            id="goal-month"
            value={month}
            onChange={(event) => selectPeriod(Number(event.target.value), year)}
            className={cn(fieldClass, "capitalize")}
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index + 1}>
                {capitalize(name)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="goal-year" className="mb-1 block text-xs font-semibold">
            Ano
          </label>
          <input
            id="goal-year"
            inputMode="numeric"
            value={year}
            onChange={(event) => selectPeriod(month, event.target.value.replace(/\D/g, "").slice(0, 4))}
            className={cn(fieldClass, "font-mono")}
          />
        </div>
        <div>
          <label htmlFor="goal-revenue" className="mb-1 block text-xs font-semibold">
            Meta (R$)
          </label>
          <input
            id="goal-revenue"
            inputMode="decimal"
            placeholder="Ex.: 1.500,00"
            value={revenueGoal}
            onChange={(event) => setRevenueGoal(event.target.value)}
            className={cn(fieldClass, "font-mono")}
          />
        </div>
        <div>
          <label htmlFor="goal-margin" className="mb-1 block text-xs font-semibold">
            Margem desejada (%)
          </label>
          <input
            id="goal-margin"
            inputMode="decimal"
            placeholder="Ex.: 40"
            value={desiredMargin}
            onChange={(event) => setDesiredMargin(event.target.value)}
            className={cn(fieldClass, "font-mono")}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="col-span-2 h-11 rounded-control bg-primary-foreground px-6 text-sm font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-50 lg:col-span-1"
        >
          {submitting ? "Salvando..." : editing ? "Atualizar meta" : "Salvar meta"}
        </button>
      </div>

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
