"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { completeOnboarding } from "@/lib/actions/onboarding";
import {
  settingsFormFieldsBaseSchema,
  feesBelow100PercentUI,
  settingsValuesToFraction,
} from "@/lib/validations/settings";
import { SettingsFormFields } from "@/components/settings/settings-form-fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = settingsFormFieldsBaseSchema
  .extend({ revenueGoal: z.number().min(0, "Informe uma meta válida") })
  .refine(feesBelow100PercentUI, {
    message: "A soma de taxa administrativa e taxa de cartão precisa ser menor que 100%",
    path: ["cardFee"],
  });

type FormValues = z.infer<typeof formSchema>;

export function OnboardingForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const { revenueGoal, ...feeValues } = values;
    const result = await completeOnboarding({ revenueGoal, ...settingsValuesToFraction(feeValues) });
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div>
        <label htmlFor="revenueGoal" className="mb-1.5 block text-sm font-medium text-foreground">
          Meta de faturamento deste mês (R$)
        </label>
        <Input
          id="revenueGoal"
          type="number"
          step="0.01"
          invalid={!!errors.revenueGoal}
          {...register("revenueGoal", { valueAsNumber: true })}
        />
        {errors.revenueGoal && (
          <p className="mt-1.5 text-sm text-destructive">{errors.revenueGoal.message}</p>
        )}
      </div>

      <SettingsFormFields register={register} errors={errors} />

      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Concluir e ir para o painel"}
      </Button>
    </form>
  );
}
