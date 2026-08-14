import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "Precificação, produtos, estoque e vendas",
  "Metas e acompanhamento de lucro",
  "Acesso vitalício, sem mensalidade",
];

export function PricingCTA() {
  return (
    <section id="preco" className="py-20">
      <div className="mx-auto max-w-lg px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Preço</h2>
        <div className="mt-8 rounded-2xl border border-border bg-card p-8">
          <p className="text-5xl font-bold tabular-nums text-foreground">R$ 129,90</p>
          <p className="mt-1 text-sm text-muted-foreground">Pagamento único — acesso vitalício</p>
          <ul className="mt-6 flex flex-col gap-2.5 text-left">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-success" /> {item}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full">
            <Link href="/checkout">Começar agora</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
