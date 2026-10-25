"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { registerSale } from "@/lib/actions/sales";
import { calculateSaleFees, describeChannelFees } from "@/lib/finance/channels";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  customerName: z.string().trim().max(120, "Máximo de 120 caracteres").optional(),
  channelId: z.string().min(1, "Selecione o canal de venda"),
  paymentMethod: z.string().min(1, "Selecione a forma de pagamento"),
  discount: z.number().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Selecione um produto"),
        quantity: z.number().int().positive("Informe uma quantidade válida"),
        unitPrice: z.number().min(0, "Informe um preço válido"),
      })
    )
    .min(1, "Adicione ao menos um produto"),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.infer<typeof formSchema>;

export interface SaleFormProduct {
  id: string;
  name: string;
  currentPrice: number;
}

export interface SaleFormChannel {
  id: string;
  name: string;
  /** Fração (0,14 = 14%). */
  commission: number;
  /** R$ por peça. */
  fixedFee: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Campo vazio vira NaN com valueAsNumber; na estimativa ele conta como 0.
function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function SaleForm({
  products,
  channels,
  adminFee,
  onRegistered,
}: {
  products: SaleFormProduct[];
  /** Canais ativos, na ordem de Configurações. */
  channels: SaleFormChannel[];
  /** Taxa administrativa de settings (fração), só para a estimativa de taxas. */
  adminFee: number;
  /** Chamado após registrar a venda. Sem ele, a página volta para a lista de vendas. */
  onRegistered?: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      discount: 0,
      channelId: channels[0]?.id ?? "",
      paymentMethod: "pix",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [channelId, items, discount] = useWatch({ control, name: ["channelId", "items", "discount"] });
  const channel = channels.find((c) => c.id === channelId);
  const grossRevenue =
    (items ?? []).reduce((sum, item) => sum + num(item?.quantity) * num(item?.unitPrice), 0) - num(discount);
  const totalQuantity = (items ?? []).reduce((sum, item) => sum + num(item?.quantity), 0);
  const estimatedFees = channel
    ? calculateSaleFees({ grossRevenue: Math.max(grossRevenue, 0), totalQuantity, adminFee, channel })
    : 0;

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setValue(`items.${index}.unitPrice`, product?.currentPrice ?? 0);
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await registerSale(values);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    if (onRegistered) onRegistered();
    else router.push("/dashboard/vendas");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-2xl flex-col gap-6">
      <div>
        <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium text-foreground">
          Cliente <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Input
          id="customerName"
          placeholder="Nome do cliente"
          autoComplete="off"
          maxLength={120}
          invalid={!!errors.customerName}
          {...register("customerName")}
        />
        {errors.customerName && (
          <p className="mt-1 text-sm text-destructive">{errors.customerName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="channelId" className="mb-1.5 block text-sm font-medium text-foreground">
          Canal de venda
        </label>
        {channels.length > 0 ? (
          <>
            <Select id="channelId" {...register("channelId")} invalid={!!errors.channelId}>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {channel && (
              <p className="mt-1 text-xs text-muted-foreground">
                {describeChannelFees(channel)}
                {grossRevenue > 0 && <> · taxas estimadas desta venda: {formatCurrency(estimatedFees)}</>}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum canal ativo.{" "}
            <Link href="/dashboard/configuracoes" className="font-medium text-primary underline-offset-4 hover:underline">
              Ative um canal em Configurações
            </Link>{" "}
            para registrar vendas.
          </p>
        )}
        {errors.channelId && <p className="mt-1 text-sm text-destructive">{errors.channelId.message}</p>}
      </div>

      <div className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const productField = register(`items.${index}.productId`);
          return (
            <div key={field.id} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Produto</label>
                <Select
                  {...productField}
                  onChange={(e) => {
                    productField.onChange(e);
                    handleProductChange(index, e.target.value);
                  }}
                  invalid={!!errors.items?.[index]?.productId}
                >
                  <option value="">Selecione</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-24">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Qtd.</label>
                <Input
                  type="number"
                  step="1"
                  invalid={!!errors.items?.[index]?.quantity}
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="w-32">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Preço unit. (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.items?.[index]?.unitPrice}
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
        >
          <Plus className="h-4 w-4" /> Adicionar produto
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Forma de pagamento</label>
          <Select {...register("paymentMethod")} invalid={!!errors.paymentMethod}>
            <option value="pix">Pix</option>
            <option value="cartao_credito">Cartão de crédito</option>
            <option value="cartao_debito">Cartão de débito</option>
            <option value="dinheiro">Dinheiro</option>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Desconto (R$)</label>
          <Input type="number" step="0.01" {...register("discount", { valueAsNumber: true })} />
        </div>
      </div>

      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Registrando..." : "Registrar venda"}
      </Button>
    </form>
  );
}
