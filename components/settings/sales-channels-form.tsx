"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Plus, Store, Trash2 } from "lucide-react";
import { saveSalesChannels } from "@/lib/actions/sales-channels";
import {
  channelToFraction,
  channelToPercent,
  MAX_SALES_CHANNELS,
  salesChannelsFormSchema,
  type SalesChannelValues,
} from "@/lib/validations/sales-channels";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type FormValues = { channels: ReturnType<typeof channelToPercent>[] };

const inputClass =
  "w-full min-w-0 bg-transparent font-mono text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function shellClass(invalid: boolean) {
  return cn(
    "flex h-11 items-center gap-2 rounded-control border bg-field px-3.5 focus-within:ring-2 focus-within:ring-ring",
    invalid ? "border-destructive" : "border-input"
  );
}

export function SalesChannelsForm({ channels }: { channels: SalesChannelValues[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(salesChannelsFormSchema),
    defaultValues: { channels: channels.map(channelToPercent) },
  });
  // keyName separado: o `id` de cada canal é o id do banco, não a chave do React.
  const { fields, append, remove } = useFieldArray({ control, name: "channels", keyName: "key" });
  const values = useWatch({ control, name: "channels" });

  // Depois de salvar, o router.refresh() traz os canais novos já com id: o formulário passa
  // a partir deles (sem isso, salvar de novo tentaria criar os mesmos canais outra vez).
  useEffect(() => {
    reset({ channels: channels.map(channelToPercent) });
  }, [channels, reset]);

  async function onSubmit(formValues: FormValues) {
    setServerError(null);
    setSuccess(false);
    const result = await saveSalesChannels(formValues.channels.map(channelToFraction));
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  const listError = errors.channels?.root?.message ?? errors.channels?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-primary">
          <Store className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-bold">Canais de venda</h2>
          <p className="text-xs text-muted-foreground">
            Comissão e taxa fixa de cada canal. Ao registrar a venda, a taxa do canal escolhido entra no lugar da taxa
            de cartão.
          </p>
        </div>
      </div>

      <div
        className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem_2.25rem] gap-3 px-1 pb-1.5 text-xs font-semibold text-foreground md:grid"
        aria-hidden
      >
        <span>Canal</span>
        <span>Comissão</span>
        <span>Taxa fixa por peça</span>
        <span className="text-center">Ativo</span>
        <span />
      </div>

      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const fieldErrors = errors.channels?.[index];
          const isNew = !values?.[index]?.id;
          const inactive = values?.[index]?.active === false;
          return (
            <li
              key={field.key}
              className={cn(
                "grid grid-cols-2 items-start gap-3 rounded-control border border-border p-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem_2.25rem] md:border-0 md:p-0",
                inactive && "opacity-60"
              )}
            >
              <div className="col-span-2 md:col-span-1">
                <label htmlFor={`channel-${index}-name`} className="mb-1.5 block text-xs font-semibold md:sr-only">
                  Canal
                </label>
                <div className={shellClass(!!fieldErrors?.name)}>
                  <input
                    id={`channel-${index}-name`}
                    maxLength={60}
                    placeholder="Nome do canal"
                    autoComplete="off"
                    aria-invalid={fieldErrors?.name ? true : undefined}
                    className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    {...register(`channels.${index}.name`)}
                  />
                </div>
                {fieldErrors?.name && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.name.message}</p>}
              </div>

              <div>
                <label htmlFor={`channel-${index}-commission`} className="mb-1.5 block text-xs font-semibold md:sr-only">
                  Comissão
                </label>
                <div className={shellClass(!!fieldErrors?.commission)}>
                  <input
                    id={`channel-${index}-commission`}
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    aria-invalid={fieldErrors?.commission ? true : undefined}
                    className={inputClass}
                    {...register(`channels.${index}.commission`, { valueAsNumber: true })}
                  />
                  <span className="font-mono text-xs text-muted-foreground">%</span>
                </div>
                {fieldErrors?.commission && (
                  <p className="mt-1.5 text-xs text-destructive">{fieldErrors.commission.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`channel-${index}-fixed`} className="mb-1.5 block text-xs font-semibold md:sr-only">
                  Taxa fixa por peça
                </label>
                <div className={shellClass(!!fieldErrors?.fixedFee)}>
                  <span className="font-mono text-xs text-muted-foreground">R$</span>
                  <input
                    id={`channel-${index}-fixed`}
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    aria-invalid={fieldErrors?.fixedFee ? true : undefined}
                    className={inputClass}
                    {...register(`channels.${index}.fixedFee`, { valueAsNumber: true })}
                  />
                </div>
                {fieldErrors?.fixedFee && (
                  <p className="mt-1.5 text-xs text-destructive">{fieldErrors.fixedFee.message}</p>
                )}
              </div>

              <label className="flex h-11 items-center gap-2 text-sm md:justify-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={`Canal ${values?.[index]?.name || index + 1} ativo`}
                  {...register(`channels.${index}.active`)}
                />
                <span className="md:sr-only">Ativo</span>
              </label>

              <div className="flex h-11 items-center justify-end">
                {isNew && (
                  <Button type="button" variant="ghost" size="sm" aria-label="Remover canal" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        Canais já usados em vendas não podem ser excluídos: desmarque &quot;Ativo&quot; para tirá-los do registro de vendas.
      </p>

      <div aria-live="polite" className="mt-3 flex flex-col gap-2 empty:hidden">
        {listError && <Alert variant="destructive">{listError}</Alert>}
        {serverError && <Alert variant="destructive">{serverError}</Alert>}
        {success && !isDirty && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <CircleCheck className="h-4 w-4" aria-hidden />
            Canais salvos.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={fields.length >= MAX_SALES_CHANNELS}
          onClick={() => append({ name: "", commission: 0, fixedFee: 0, active: true })}
        >
          <Plus className="h-4 w-4" /> Adicionar canal
        </Button>
        <div className="flex flex-wrap gap-2">
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
            {isSubmitting ? "Salvando..." : "Salvar canais"}
          </Button>
        </div>
      </div>
    </form>
  );
}
