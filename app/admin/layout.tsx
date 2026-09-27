import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/require-admin";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

// A checagem aqui só evita mostrar o menu de admin num 404 para quem não é admin. Ela não
// protege as páginas (layouts não re-renderizam na navegação e não impedem as rotas filhas
// de rodar), então cada página e Server Action também chama requireAdmin()/getAdminUser().
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div
      className={`${plusJakartaSans.variable} dashboard-theme font-sans flex min-h-screen flex-col bg-background text-foreground`}
    >
      <AdminNav />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
