import type { ReactNode } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/dashboard/page-transition";
import { getAdminIdentity } from "@/lib/admin/require-admin";
import { createClient } from "@/lib/supabase/server";

// Geist e Geist Mono vêm do layout raiz; aqui só a fonte display do painel.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // RLS: o client da sessão só enxerga a própria linha de profiles.
  const { data: profile } = user
    ? await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle()
    : { data: null };

  // Só decide se o link "Admin" aparece (mesmo antes do 2FA — o link leva à verificação);
  // a proteção de /admin fica em requireAdmin().
  const isAdmin = (await getAdminIdentity()) !== null;

  return (
    <div
      className={`${bricolage.variable} panel-theme flex min-h-screen flex-col bg-background text-foreground md:flex-row`}
    >
      <Sidebar
        isAdmin={isAdmin}
        account={{ name: profile?.name ?? "Minha loja", email: user?.email ?? "" }}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
