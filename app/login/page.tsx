"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "Senha muito curta"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
        Faturio
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta do Faturio.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Senha
              </label>
              <Input
                id="password"
                type="password"
                invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {serverError && <Alert variant="destructive">{serverError}</Alert>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 flex justify-between text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="hover:text-foreground">
              Esqueci minha senha
            </Link>
            <Link href="/checkout" className="hover:text-foreground">
              Comece agora
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
