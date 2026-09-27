"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 md:px-10">
        <Link href="/admin" className="text-lg font-bold tracking-tight text-foreground">
          Faturio <span className="text-sm font-medium text-primary">Admin</span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
