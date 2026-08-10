"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { startCheckout } from "@/lib/actions/checkout";

const formSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CheckoutPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await startCheckout(values);
    if (!result.success || !result.redirectUrl) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    window.location.href = result.redirectUrl;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Começar agora</h1>
        <p className="text-muted-foreground">
          Acesso completo por R$ 129,90 (pagamento único).
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Nome completo
          </label>
          <input id="name" {...register("name")} className="w-full rounded-md border px-3 py-2" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Redirecionando..." : "Ir para pagamento — R$ 129,90"}
        </button>
      </form>
    </main>
  );
}
