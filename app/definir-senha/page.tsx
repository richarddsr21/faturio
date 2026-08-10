"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

export default function DefinirSenhaPage() {
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
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError("Não foi possível definir sua senha. Tente novamente.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Definir senha</h1>
        <p className="text-muted-foreground">Escolha uma senha para acessar sua conta.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
