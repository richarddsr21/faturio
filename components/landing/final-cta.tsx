import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="border-t border-border bg-muted/40 py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Pare de adivinhar. Comece a saber.
        </h2>
        <p className="text-lg text-muted-foreground">
          Preço certo, estoque em dia e a meta do mês sempre à vista, por R$ 129,90 uma única vez.
        </p>
        <Button asChild size="lg">
          <Link href="/checkout">Começar agora</Link>
        </Button>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> Garantia de 7 dias ou seu dinheiro de
          volta
        </p>
      </div>
    </section>
  );
}
