"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerStockMovement } from "@/lib/actions/stock";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  type: z.enum(["entry", "adjustment", "return"]),
  quantity: z.number().int().refine((v) => v !== 0, "Informe uma quantidade diferente de zero"),
  unitCost: z.number().min(0).optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function StockMovementForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { type: "entry" } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await registerStockMovement({ ...values, productId });
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3 py-2">
      <div>
        <label htmlFor="type" className="mb-1.5 block text-xs font-medium text-foreground">
          Tipo
        </label>
        <Select id="type" {...register("type")}>
          <option value="entry">Entrada</option>
          <option value="adjustment">Ajuste (+/-)</option>
          <option value="return">Devolução</option>
        </Select>
      </div>
      <div>
        <label htmlFor="quantity" className="mb-1.5 block text-xs font-medium text-foreground">
          Quantidade
        </label>
        <Input
          id="quantity"
          type="number"
          step="1"
          className="w-28"
          invalid={!!errors.quantity}
          {...register("quantity", { valueAsNumber: true })}
        />
      </div>
      <div>
        <label htmlFor="unitCost" className="mb-1.5 block text-xs font-medium text-foreground">
          Custo unitário (opcional)
        </label>
        <Input
          id="unitCost"
          type="number"
          step="0.01"
          className="w-32"
          {...register("unitCost", { valueAsNumber: true })}
        />
      </div>
      <div className="flex-1 basis-40">
        <label htmlFor="reason" className="mb-1.5 block text-xs font-medium text-foreground">
          Motivo (opcional)
        </label>
        <Input id="reason" {...register("reason")} />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Registrar"}
      </Button>
      {errors.quantity && (
        <p className="basis-full text-sm text-destructive">{errors.quantity.message}</p>
      )}
      {serverError && (
        <div className="basis-full">
          <Alert variant="destructive">{serverError}</Alert>
        </div>
      )}
    </form>
  );
}
