"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upsertGoal } from "@/lib/actions/goals";
import { percentToFraction } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  revenueGoal: z.number().min(0, "Informe uma meta válida"),
  desiredMargin: z.number().min(0).max(99.99, "Informe um percentual menor que 100%").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function GoalForm({
  defaultMonth,
  defaultYear,
}: {
  defaultMonth: number;
  defaultYear: number;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { month: defaultMonth, year: defaultYear },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccess(false);
    const result = await upsertGoal({
      ...values,
      desiredMargin: values.desiredMargin !== undefined ? percentToFraction(values.desiredMargin) : undefined,
    });
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
          <div className="w-24">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mês</label>
            <Input type="number" step="1" min={1} max={12} {...register("month", { valueAsNumber: true })} />
          </div>
          <div className="w-28">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Ano</label>
            <Input type="number" step="1" {...register("year", { valueAsNumber: true })} />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Meta (R$)</label>
            <Input
              type="number"
              step="0.01"
              invalid={!!errors.revenueGoal}
              {...register("revenueGoal", { valueAsNumber: true })}
            />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Margem desejada (%)</label>
            <Input type="number" step="0.01" {...register("desiredMargin", { valueAsNumber: true })} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar meta"}
          </Button>
          {errors.revenueGoal && (
            <p className="basis-full text-sm text-destructive">{errors.revenueGoal.message}</p>
          )}
          {serverError && (
            <div className="basis-full">
              <Alert variant="destructive">{serverError}</Alert>
            </div>
          )}
          {success && (
            <div className="basis-full">
              <Alert>Meta salva com sucesso.</Alert>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
