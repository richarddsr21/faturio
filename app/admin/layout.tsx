import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

// Só o tema. A checagem de acesso fica em (painel)/layout.tsx e em cada página; a
// verificação 2FA (/admin/verificacao) fica fora do painel para não entrar em loop.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${plusJakartaSans.variable} dashboard-theme font-sans flex min-h-screen flex-col bg-background text-foreground`}
    >
      {children}
    </div>
  );
}
