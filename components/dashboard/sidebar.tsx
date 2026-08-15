"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Target,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/estoque", label: "Estoque", icon: Boxes },
  { href: "/dashboard/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/dashboard/metas", label: "Metas", icon: Target },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sair
      </button>
    </form>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-6 md:hidden">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="flex flex-col gap-1 border-b border-border px-6 py-4 md:hidden">
          <SidebarLinks onNavigate={() => setOpen(false)} />
          <div className="mt-1 border-t border-border pt-1">
            <SignOutButton />
          </div>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border p-4 md:flex md:flex-col md:gap-6">
        <Link href="/dashboard" className="px-2 text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <div className="flex flex-1 flex-col justify-between">
          <SidebarLinks />
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
