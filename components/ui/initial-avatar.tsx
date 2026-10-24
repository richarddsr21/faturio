import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = [
  "bg-primary text-primary-foreground",
  "bg-lilac text-background",
  "bg-warning text-background",
];

/** Avatar com a inicial do nome; sem nome, mostra um ícone neutro. A cor é fixa por nome. */
export function InitialAvatar({ name, className }: { name?: string | null; className?: string }) {
  const trimmed = name?.trim();
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold";

  if (!trimmed) {
    return (
      <span aria-hidden className={cn(base, "bg-muted text-muted-foreground", className)}>
        <User className="h-4 w-4" />
      </span>
    );
  }

  const hash = [...trimmed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span aria-hidden className={cn(base, tones[hash % tones.length], className)}>
      {trimmed.charAt(0).toUpperCase()}
    </span>
  );
}
