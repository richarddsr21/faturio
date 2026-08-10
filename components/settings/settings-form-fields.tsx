"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { SettingsFieldsValues } from "@/lib/validations/settings";

interface SettingsFormFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

const fields: { name: keyof SettingsFieldsValues; label: string; step: string }[] = [
  { name: "packagingCost", label: "Custo de embalagem (R$)", step: "0.01" },
  { name: "shippingCost", label: "Frete médio (R$)", step: "0.01" },
  { name: "giftCost", label: "Custo de brinde (R$)", step: "0.01" },
  { name: "trafficCost", label: "Custo médio de tráfego por venda (R$)", step: "0.01" },
  { name: "adminFee", label: "Taxa administrativa (ex: 0.05 para 5%)", step: "0.0001" },
  { name: "cardFee", label: "Taxa de cartão (ex: 0.03 para 3%)", step: "0.0001" },
  { name: "desiredMargin", label: "Margem desejada (ex: 0.3 para 30%)", step: "0.0001" },
];

export function SettingsFormFields({ register, errors }: SettingsFormFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
          </label>
          <Input
            id={field.name}
            type="number"
            step={field.step}
            invalid={!!errors[field.name]}
            {...register(field.name, { valueAsNumber: true })}
          />
          {errors[field.name] && (
            <p className="mt-1.5 text-sm text-destructive">{String(errors[field.name]?.message)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
