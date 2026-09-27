import { notFound, redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getAdminIdentity } from "@/lib/admin/require-admin";
import { signOut } from "@/lib/actions/auth";
import { AdminMfaForm } from "@/components/admin/admin-mfa-form";

export default async function AdminVerificacaoPage() {
  const identity = await getAdminIdentity();
  if (!identity) notFound();
  if (identity.mfaVerified) redirect("/admin");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
      <AdminMfaForm />
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </main>
  );
}
