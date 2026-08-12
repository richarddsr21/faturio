import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroVisual } from "./hero-visual";

export function Hero() {
  return (
    <section
      id="produto"
      className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 pb-24 pt-20 lg:flex-row lg:items-center lg:pt-28"
    >
      <div className="flex max-w-xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
          Saiba quanto vender, quanto lucrar e quanto falta para atingir sua meta.
        </h1>
        <p className="text-lg text-muted-foreground">
          Controle preços, produtos, estoque, vendas, custos e resultados em um único lugar.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/checkout">Começar agora</Link>
          </Button>
          <Badge>R$ 1,00 — Pagamento único</Badge>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}
