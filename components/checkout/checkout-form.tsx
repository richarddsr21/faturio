"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { startCheckout } from "@/lib/actions/checkout";
import { formatPrice, MONTHLY_PRICES, PLAN_NAMES, type RecurringPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
});

type FormValues = z.infer<typeof formSchema>;

export function CheckoutForm({ plan }: { plan: RecurringPlan }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const price = `${formatPrice(MONTHLY_PRICES[plan])}/mês`;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await startCheckout({ ...values, plan });
    if (!result.success || !result.redirectUrl) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    window.location.assign(result.redirectUrl);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
        Faturio
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Plano {PLAN_NAMES[plan]}</CardTitle>
          <CardDescription>Assinatura mensal. Cancele quando quiser.</CardDescription>
          <Badge className="mt-1 w-fit">{price}</Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                Nome completo
              </label>
              <Input id="name" invalid={!!errors.name} {...register("name")} />
              {errors.name && (
                <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
              {errors.email ? (
                <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>
              ) : (
                // O Mercado Pago só aceita assinar com o e-mail da conta que vai pagar.
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Use o mesmo e-mail da sua conta do Mercado Pago.
                </p>
              )}
            </div>
            {serverError && <Alert variant="destructive">{serverError}</Alert>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Redirecionando..." : `Assinar — ${price}`}
            </Button>
            <Link href="/planos" className="text-center text-sm text-muted-foreground hover:text-foreground">
              Ver outros planos
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
