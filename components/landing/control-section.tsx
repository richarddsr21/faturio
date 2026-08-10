import { X, Check } from "lucide-react";

const before = ["Confusão", "Planilhas", "Cálculos manuais", "Falta de controle"];
const after = ["Clareza", "Organização", "Controle", "Decisão"];

export function ControlSection() {
  return (
    <section className="border-t border-border bg-muted/40 py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Chega de números espalhados
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 text-left">
            <p className="mb-4 text-sm font-semibold text-muted-foreground">ANTES</p>
            <ul className="flex flex-col gap-3">
              {before.map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <X className="h-4 w-4 shrink-0 text-destructive" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-card p-6 text-left">
            <p className="mb-4 text-sm font-semibold text-primary">DEPOIS</p>
            <ul className="flex flex-col gap-3">
              {after.map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
