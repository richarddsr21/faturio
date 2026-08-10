"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { settingsFieldsBaseSchema, feesBelow100Percent } from "@/lib/validations/settings";
import { SettingsFormFields } from "@/components/settings/settings-form-fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = settingsFieldsBaseSchema
  .extend({ revenueGoal: z.number().min(0, "Informe uma meta válida") })
  .refine(feesBelow100Percent, {
    message:
      "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
    path: ["desiredMargin"],
  });

type FormValues = z.infer<typeof formSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await completeOnboarding(values);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
