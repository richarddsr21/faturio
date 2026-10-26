import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "Precificação, produtos, estoque e vendas",
  "Metas e acompanhamento de lucro",
  "Relatórios comparativos com exportação em PDF e Excel",
  "Importação de produtos por planilha",
  "Sem fidelidade: cancele quando quiser",
];

export function PricingCTA() {
  return (
    <section id="preco" className="py-20">
      <div className="mx-auto max-w-lg px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Preço</h2>
        <p className="mt-3 text-muted-foreground">
          Assinatura mensal, sem fidelidade. Escolha o plano que cabe no seu negócio.
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-8">
          <p className="text-sm font-medium text-muted-foreground">A partir de</p>
          <p className="text-5xl font-bold tabular-nums text-foreground">
            R$ 29,90<span className="text-xl font-semibold text-muted-foreground">/mês</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Plano Essencial</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Precisa de mais? Os planos Pro e IA trazem lucro real, clientes, fiado e inteligência artificial.{" "}
            <Link href="/planos" className="font-medium text-foreground underline-offset-4 hover:underline">
              Ver todos os planos
            </Link>
          </p>
          <ul className="mt-6 flex flex-col gap-2.5 text-left">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-success" /> {item}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full">
            <Link href="/planos">Começar agora</Link>
          </Button>
          <div className="mt-6 flex items-start gap-3 rounded-[10px] bg-success/10 p-4 text-left">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-semibold text-foreground">Garantia de 7 dias</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Não gostou? Peça o reembolso em até 7 dias e devolvemos 100% do valor, sem
                perguntas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
