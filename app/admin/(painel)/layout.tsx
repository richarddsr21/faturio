import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/require-admin";

// A checagem aqui só evita mostrar o menu de admin num 404 para quem não é admin. Ela não
// protege as páginas (layouts não re-renderizam na navegação e não impedem as rotas filhas
// de rodar), então cada página e Server Action também chama requireAdmin()/getAdminUser().
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <>
      <AdminNav />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </>
  );
}
