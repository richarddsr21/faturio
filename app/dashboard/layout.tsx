import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/dashboard/page-transition";
import { getAdminIdentity } from "@/lib/admin/require-admin";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Só decide se o link "Admin" aparece (mesmo antes do 2FA — o link leva à verificação);
  // a proteção de /admin fica em requireAdmin().
  const isAdmin = (await getAdminIdentity()) !== null;

  return (
    <div
      className={`${plusJakartaSans.variable} dashboard-theme font-sans flex min-h-screen flex-col bg-background text-foreground md:flex-row`}
    >
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
