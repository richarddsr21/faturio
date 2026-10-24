"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, CircleHelp, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { dashboardNavItems as links } from "@/components/dashboard/nav-items";

export interface SidebarAccount {
  name: string;
  email: string;
}

const secondaryLinkClass =
  "flex items-center gap-3 rounded-control px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-1" aria-label="Faturio — Visão geral">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
        <TrendingUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-foreground">faturio</span>
    </Link>
  );
}

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
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-button-primary)]"
                  : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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

function SecondaryLinks({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {isAdmin && (
        <Link href="/admin" className={secondaryLinkClass}>
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Admin
        </Link>
      )}
      <a href="mailto:richarddsr21@gmail.com" className={secondaryLinkClass}>
        <CircleHelp className="h-4 w-4 shrink-0" />
        Suporte
      </a>
    </div>
  );
}

function AccountCard({ account }: { account: SidebarAccount }) {
  const initial = account.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-2.5 rounded-control border border-border bg-card p-2.5">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{account.name}</p>
        {account.email && <p className="truncate text-[11px] text-muted-foreground">{account.email}</p>}
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Sair"
          title="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ isAdmin, account }: { isAdmin: boolean; account: SidebarAccount }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-control text-foreground hover:bg-muted"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:hidden">
          <SidebarLinks onNavigate={() => setOpen(false)} />
          <div className="border-t border-border pt-3">
            <SecondaryLinks isAdmin={isAdmin} />
          </div>
          <AccountCard account={account} />
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border px-4 py-6 md:flex md:flex-col md:gap-8">
        <Logo />
        <div className="flex flex-1 flex-col justify-between gap-6">
          <SidebarLinks />
          <div className="flex flex-col gap-3">
            <SecondaryLinks isAdmin={isAdmin} />
            <AccountCard account={account} />
          </div>
        </div>
      </aside>
    </>
  );
}
