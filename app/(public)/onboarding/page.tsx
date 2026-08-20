import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vamos configurar seu painel</h1>
        <p className="text-muted-foreground">
          Responda as perguntas abaixo para personalizar seus cálculos de preço e sua meta.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
