"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Package, Percent, TrendingUp } from "lucide-react";
import { updateSettings } from "@/lib/actions/settings";
import {
  settingsFormFieldsSchema,
  settingsValuesToFraction,
  settingsValuesToPercent,
  type SettingsFieldsValues,
  type SettingsFormFieldsValues,
} from "@/lib/validations/settings";
import { salePreview, suggestedPrice } from "@/lib/settings/price-preview";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface PreviewProduct {
  id: string;
  name: string;
  cost: number;
  entryShipping: number;
  price: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// Campo vazio vira NaN com valueAsNumber; na prévia ele conta como 0.
function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Exemplo para quem ainda não cadastrou produto.
const exampleProduct: PreviewProduct = { id: "exemplo", name: "Produto de exemplo", cost: 25, entryShipping: 0, price: 59.9 };

export function SettingsForm({
  defaultValues,
  products,
}: {
  defaultValues: SettingsFieldsValues;
  products: PreviewProduct[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewId, setPreviewId] = useState(products[0]?.id ?? exampleProduct.id);
  const initial = settingsValuesToPercent(defaultValues);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormFieldsValues>({
    resolver: zodResolver(settingsFormFieldsSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control });

  const product = products.find((p) => p.id === previewId) ?? products[0] ?? exampleProduct;
  // Taxas e margem estão em % no formulário; a prévia trabalha em fração.
  const costs = {
    packagingCost: num(values.packagingCost),
    shippingCost: num(values.shippingCost),
    giftCost: num(values.giftCost),
    trafficCost: num(values.trafficCost),
    adminFee: num(values.adminFee) / 100,
    cardFee: num(values.cardFee) / 100,
  };
  const marginPercent = num(values.desiredMargin);
  const preview = salePreview(product.cost, product.price, costs);
  const suggested = suggestedPrice(product, costs, marginPercent / 100);
  const sliderMax = Math.max(100, Math.ceil(marginPercent / 50) * 50);

  async function onSubmit(formValues: SettingsFormFieldsValues) {
    setServerError(null);
    setSuccess(false);
    const result = await updateSettings(settingsValuesToFraction(formValues));
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setSuccess(true);
    reset(formValues); // os valores salvos passam a ser a base do "Descartar"
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-4">
        <Group icon={Package} title="Custos por venda" description="Valor fixo que sai do seu bolso a cada pedido">
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField id="packagingCost" label="Embalagem" error={errors.packagingCost?.message} registration={register("packagingCost", { valueAsNumber: true })} />
            <MoneyField id="shippingCost" label="Frete médio" error={errors.shippingCost?.message} registration={register("shippingCost", { valueAsNumber: true })} />
            <MoneyField id="giftCost" label="Brinde" error={errors.giftCost?.message} registration={register("giftCost", { valueAsNumber: true })} />
            <MoneyField id="trafficCost" label="Tráfego pago por venda" error={errors.trafficCost?.message} registration={register("trafficCost", { valueAsNumber: true })} />
          </div>
        </Group>

        <Group icon={Percent} title="Taxas" description="Percentual descontado do valor da venda">
          <div className="grid gap-3 sm:grid-cols-2">
            <PercentField id="adminFee" label="Taxa administrativa" error={errors.adminFee?.message} registration={register("adminFee", { valueAsNumber: true })} />
            <PercentField id="cardFee" label="Taxa de cartão" error={errors.cardFee?.message} registration={register("cardFee", { valueAsNumber: true })} />
          </div>
        </Group>

        <Group
          icon={TrendingUp}
          title="Margem desejada"
          description="Usada para sugerir o preço de venda dos produtos"
          aside={
            <span className="font-display text-3xl font-bold tabular-nums text-primary">
              {marginPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
            </span>
          }
        >
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={1}
            aria-label="Margem desejada (%)"
            className="w-full accent-[var(--primary)]"
            {...register("desiredMargin", { valueAsNumber: true })}
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden>
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <span key={step}>{Math.round(sliderMax * step)}%</span>
            ))}
          </div>
          {errors.desiredMargin && <p className="mt-2 text-sm text-destructive">{errors.desiredMargin.message}</p>}
        </Group>

        <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
          {serverError && <Alert variant="destructive">{serverError}</Alert>}
          {success && !isDirty && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <CircleCheck className="h-4 w-4" aria-hidden />
              Configurações salvas.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || isSubmitting}
            onClick={() => {
              reset();
              setServerError(null);
            }}
          >
            Descartar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </div>

      <aside
        className="flex min-w-0 flex-col gap-4 rounded-card bg-primary p-5 text-primary-foreground shadow-[var(--shadow-button-primary)] sm:p-6 lg:sticky lg:top-6"
        aria-label="Prévia ao vivo"
      >
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em]">Prévia ao vivo</p>
          {products.length > 1 ? (
            <select
              value={product.id}
              onChange={(event) => setPreviewId(event.target.value)}
              aria-label="Produto da prévia"
              className="mt-2 w-full truncate rounded-[10px] border-0 bg-primary-foreground/10 px-2.5 py-1.5 font-display text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-background text-foreground">
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="mt-2 truncate text-xl font-bold">{product.name}</h2>
          )}
          {products.length === 0 && (
            <p className="mt-1 text-xs opacity-75">Cadastre um produto para ver a prévia com ele.</p>
          )}
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          <PreviewRow label="Custo do produto" value={formatCurrency(product.cost)} />
          <PreviewRow label="Custos por venda" value={formatCurrency(preview.perSaleCosts)} />
          <PreviewRow
            label="Taxas"
            value={preview.feesRate > 0 ? `${formatCurrency(preview.feesAmount)} (${formatPercent(preview.feesRate)})` : "0%"}
          />
          <div className="border-t border-primary-foreground/20 pt-2">
            <PreviewRow label="Custo real" value={formatCurrency(preview.realCost)} strong />
          </div>
        </dl>

        <div className="rounded-control bg-primary-foreground p-4 text-foreground">
          <p className="text-xs text-muted-foreground">Vendendo a {formatCurrency(product.price)} você lucra</p>
          <p
            className={cn(
              "mt-1 font-display text-3xl font-bold tracking-tight tabular-nums",
              preview.profit < 0 ? "text-destructive" : "text-primary"
            )}
          >
            {formatCurrency(preview.profit)}
          </p>
          {preview.margin !== null && (
            <p className="mt-1 text-xs text-muted-foreground">{formatPercent(preview.margin)} de margem por peça</p>
          )}
        </div>

        <p className="text-xs">
          {suggested !== null ? (
            <>
              Preço sugerido com {marginPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de margem:{" "}
              <span className="font-mono font-semibold">{formatCurrency(suggested)}</span>
            </>
          ) : (
            "Com taxas somando 100% ou mais não há preço possível."
          )}
        </p>
      </aside>
    </form>
  );
}

function Group({
  icon: Icon,
  title,
  description,
  aside,
  children,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function FieldShell({
  id,
  label,
  error,
  prefix,
  suffix,
  registration,
}: {
  id: string;
  label: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-control border bg-field px-3.5 focus-within:ring-2 focus-within:ring-ring",
          error ? "border-destructive" : "border-input"
        )}
      >
        {prefix && <span className="font-mono text-xs text-muted-foreground">{prefix}</span>}
        <input
          id={id}
          type="number"
          step="0.01"
          min={0}
          inputMode="decimal"
          aria-invalid={error ? true : undefined}
          className="w-full min-w-0 bg-transparent font-mono text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          {...registration}
        />
        {suffix && <span className="font-mono text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MoneyField(props: { id: string; label: string; error?: string; registration: UseFormRegisterReturn }) {
  return <FieldShell {...props} prefix="R$" />;
}

function PercentField(props: { id: string; label: string; error?: string; registration: UseFormRegisterReturn }) {
  return <FieldShell {...props} suffix="%" />;
}

function PreviewRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn(strong ? "font-semibold" : "opacity-80")}>{label}</dt>
      <dd className={cn("font-mono", strong ? "font-bold" : "font-semibold")}>{value}</dd>
    </div>
  );
}
