"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EsqueciSenhaPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email);
    if (error) {
      setServerError("Não foi possível enviar o e-mail de recuperação. Tente novamente.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
        Faturio
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert>Se esse e-mail estiver cadastrado, você vai receber um link de recuperação em instantes.</Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  E-mail
                </label>
                <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              {serverError && <Alert variant="destructive">{serverError}</Alert>}
              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          )}
          <div className="mt-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Voltar para o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
