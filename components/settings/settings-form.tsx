"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettings } from "@/lib/actions/settings";
import {
  settingsFormFieldsSchema,
  settingsValuesToFraction,
  settingsValuesToPercent,
  type SettingsFieldsValues,
  type SettingsFormFieldsValues,
} from "@/lib/validations/settings";
import { SettingsFormFields } from "@/components/settings/settings-form-fields";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsForm({ defaultValues }: { defaultValues: SettingsFieldsValues }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormFieldsValues>({
    resolver: zodResolver(settingsFormFieldsSchema),
    defaultValues: settingsValuesToPercent(defaultValues),
  });

  async function onSubmit(values: SettingsFormFieldsValues) {
    setServerError(null);
    setSuccess(false);
    const result = await updateSettings(settingsValuesToFraction(values));
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <SettingsFormFields register={register} errors={errors} />
          {serverError && <Alert variant="destructive">{serverError}</Alert>}
          {success && <Alert>Configurações salvas com sucesso.</Alert>}
          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
