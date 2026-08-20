"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProduct, deactivateProduct, updateProduct } from "@/lib/actions/products";
import { calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";
import { productSchema } from "@/lib/validations/product";
import { fractionToPercent, optionalNumber, percentToFraction } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// Margem/taxas são pedidas como percentual (ex: 30 para 30%) — mais natural que a fração
// armazenada no banco (0.3). `productSchema` continua sendo a forma canônica (fração), usada
// pela Server Action, que revalida de novo; aqui só sobrescrevemos o range desses campos.
const formSchema = productSchema.extend({
  desiredMargin: z.number().min(0).max(99999.99, "Valor muito alto").optional(),
  adminFee: z.number().min(0).max(99.99, "Informe um percentual menor que 100%").optional(),
  cardFee: z.number().min(0).max(99.99, "Informe um percentual menor que 100%").optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.infer<typeof formSchema>;

export interface ProductFormSettings {
  packagingCost: number;
  shippingCost: number;
  giftCost: number;
  adminFee: number;
  cardFee: number;
  desiredMargin: number;
}

export interface ProductFormProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  supplier: string | null;
  cost: number;
  entryShipping: number;
  currentPrice: number | null;
  desiredMargin: number | null;
  minimumStock: number;
  // Overrides opcionais dos custos que por padrão vêm de `settings`; null = usa o padrão.
  packagingCost: number | null;
  shippingCost: number | null;
  giftCost: number | null;
  adminFee: number | null;
  cardFee: number | null;
}

export function ProductForm({
  product,
  settings,
}: {
  product?: ProductFormProduct;
  settings: ProductFormSettings;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku ?? "",
          category: product.category ?? "",
          supplier: product.supplier ?? "",
          cost: product.cost,
          entryShipping: product.entryShipping,
          currentPrice: product.currentPrice ?? undefined,
          desiredMargin:
            product.desiredMargin !== null ? fractionToPercent(product.desiredMargin) : undefined,
          minimumStock: product.minimumStock,
          packagingCost: product.packagingCost ?? undefined,
          shippingCost: product.shippingCost ?? undefined,
          giftCost: product.giftCost ?? undefined,
          adminFee: product.adminFee !== null ? fractionToPercent(product.adminFee) : undefined,
          cardFee: product.cardFee !== null ? fractionToPercent(product.cardFee) : undefined,
        }
      : { entryShipping: 0, minimumStock: 0 },
  });

  const cost = watch("cost") || 0;
  const entryShipping = watch("entryShipping") || 0;
  const desiredMarginPercent = watch("desiredMargin");
  const desiredMargin =
    desiredMarginPercent !== undefined ? percentToFraction(desiredMarginPercent) : settings.desiredMargin;

  // Cada custo abaixo cai no valor padrão de `settings` quando o produto não tem um
  // override próprio (campo deixado em branco).
  const packagingCost = watch("packagingCost") ?? settings.packagingCost;
  const shippingCost = watch("shippingCost") ?? settings.shippingCost;
  const giftCost = watch("giftCost") ?? settings.giftCost;
  const adminFeePercent = watch("adminFee");
  const cardFeePercent = watch("cardFee");
  const adminFee = adminFeePercent !== undefined ? percentToFraction(adminFeePercent) : settings.adminFee;
  const cardFee = cardFeePercent !== undefined ? percentToFraction(cardFeePercent) : settings.cardFee;

  const suggestedPrice = useMemo(() => {
    try {
      return calculateRecommendedPrice({
        fixedCostsPerUnit: cost + entryShipping + packagingCost + shippingCost + giftCost,
        feesPercentage: adminFee + cardFee,
        desiredMargin,
      });
    } catch (error) {
      if (error instanceof PricingError) return null;
      throw error;
    }
  }, [cost, entryShipping, packagingCost, shippingCost, giftCost, adminFee, cardFee, desiredMargin]);

  // Preço de venda começa "gerenciado automaticamente" pelo preço sugerido: em produto novo,
  // ou editando um produto sem preço salvo, todo recálculo do sugerido atualiza o campo sozinho.
  // Assim que o usuário digita um valor manualmente ali, paramos de sobrescrever — a menos que
  // ele limpe o campo, aí a sugestão volta a valer.
  const priceManuallySetRef = useRef(!!product?.currentPrice);

  useEffect(() => {
    if (priceManuallySetRef.current || suggestedPrice === null) return;
    setValue("currentPrice", Number(suggestedPrice.toFixed(2)));
  }, [suggestedPrice, setValue]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const payload = {
      ...values,
      desiredMargin: values.desiredMargin !== undefined ? percentToFraction(values.desiredMargin) : undefined,
      adminFee: values.adminFee !== undefined ? percentToFraction(values.adminFee) : undefined,
      cardFee: values.cardFee !== undefined ? percentToFraction(values.cardFee) : undefined,
    };
    const result = product ? await updateProduct(product.id, payload) : await createProduct(payload);

    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
    }
  }

  async function onDeactivate() {
    if (!product) return;
    setServerError(null);
    const result = await deactivateProduct(product.id);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          Nome
        </label>
        <Input id="name" invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sku" className="mb-1.5 block text-sm font-medium text-foreground">
            SKU
          </label>
          <Input id="sku" {...register("sku")} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-foreground">
            Categoria
          </label>
          <Input id="category" {...register("category")} />
        </div>
      </div>

      <div>
        <label htmlFor="supplier" className="mb-1.5 block text-sm font-medium text-foreground">
          Fornecedor
        </label>
        <Input id="supplier" {...register("supplier")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cost" className="mb-1.5 block text-sm font-medium text-foreground">
            Custo (R$)
          </label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            invalid={!!errors.cost}
            {...register("cost", { valueAsNumber: true })}
          />
          {errors.cost && <p className="mt-1.5 text-sm text-destructive">{errors.cost.message}</p>}
        </div>
        <div>
          <label htmlFor="entryShipping" className="mb-1.5 block text-sm font-medium text-foreground">
            Frete de entrada (R$)
          </label>
          <Input
            id="entryShipping"
            type="number"
            step="0.01"
            {...register("entryShipping", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Custos deste produto (opcional)</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Deixe em branco para usar o padrão de Configurações — só preencha se este produto
          tiver um custo diferente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="packagingCost" className="mb-1.5 block text-sm font-medium text-foreground">
            Embalagem (R$)
          </label>
          <Input
            id="packagingCost"
            type="number"
            step="0.01"
            placeholder={settings.packagingCost.toFixed(2)}
            {...register("packagingCost", { setValueAs: optionalNumber })}
          />
        </div>
        <div>
          <label htmlFor="shippingCost" className="mb-1.5 block text-sm font-medium text-foreground">
            Frete de envio (R$)
          </label>
          <Input
            id="shippingCost"
            type="number"
            step="0.01"
            placeholder={settings.shippingCost.toFixed(2)}
            {...register("shippingCost", { setValueAs: optionalNumber })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="giftCost" className="mb-1.5 block text-sm font-medium text-foreground">
            Brinde (R$)
          </label>
          <Input
            id="giftCost"
            type="number"
            step="0.01"
            placeholder={settings.giftCost.toFixed(2)}
            {...register("giftCost", { setValueAs: optionalNumber })}
          />
        </div>
        <div />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="adminFee" className="mb-1.5 block text-sm font-medium text-foreground">
            Taxa administrativa (%)
          </label>
          <Input
            id="adminFee"
            type="number"
            step="0.01"
            placeholder={fractionToPercent(settings.adminFee).toString()}
            {...register("adminFee", { setValueAs: optionalNumber })}
          />
        </div>
        <div>
          <label htmlFor="cardFee" className="mb-1.5 block text-sm font-medium text-foreground">
            Taxa de cartão (%)
          </label>
          <Input
            id="cardFee"
            type="number"
            step="0.01"
            placeholder={fractionToPercent(settings.cardFee).toString()}
            {...register("cardFee", { setValueAs: optionalNumber })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="desiredMargin" className="mb-1.5 block text-sm font-medium text-foreground">
            Margem desejada (%)
          </label>
          <Input
            id="desiredMargin"
            type="number"
            step="0.01"
            {...register("desiredMargin", { setValueAs: optionalNumber })}
          />
        </div>
        <div>
          <label htmlFor="currentPrice" className="mb-1.5 block text-sm font-medium text-foreground">
            Preço de venda (R$)
          </label>
          <Input
            id="currentPrice"
            type="number"
            step="0.01"
            {...register("currentPrice", {
              setValueAs: optionalNumber,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                priceManuallySetRef.current = event.target.value !== "";
              },
            })}
          />
        </div>
      </div>

      {suggestedPrice !== null && (
        <p className="text-sm text-muted-foreground">
          Preço sugerido (preenchido automaticamente acima):{" "}
          <span className="font-semibold text-primary">
            {suggestedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {!product && (
          <div>
            <label htmlFor="initialStock" className="mb-1.5 block text-sm font-medium text-foreground">
              Estoque inicial
            </label>
            <Input
              id="initialStock"
              type="number"
              step="1"
              {...register("initialStock", { setValueAs: optionalNumber })}
            />
          </div>
        )}
        <div>
          <label htmlFor="minimumStock" className="mb-1.5 block text-sm font-medium text-foreground">
            Estoque mínimo
          </label>
          <Input
            id="minimumStock"
            type="number"
            step="1"
            {...register("minimumStock", { valueAsNumber: true })}
          />
        </div>
      </div>

      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : product ? "Salvar alterações" : "Criar produto"}
        </Button>
        {product && (
          <Button type="button" variant="secondary" onClick={onDeactivate}>
            Remover produto
          </Button>
        )}
      </div>
    </form>
  );
}
