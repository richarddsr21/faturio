import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, MONTHLY_PRICES, PLAN_NAMES, type RecurringPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Planos — Faturio",
  description: "Planos mensais do Faturio a partir de R$ 29,90/mês. Cancele quando quiser.",
};

interface PlanCard {
  plan: RecurringPlan;
  tagline: string;
  /** "Tudo do plano X, mais:" — vazio no primeiro plano. */
  includesPrevious?: RecurringPlan;
  available: string[];
  comingSoon: string[];
  highlighted?: boolean;
}

// Recursos de cada plano conforme o documento de planos. Os que ainda não existem aparecem
// como "em breve": saem dessa lista quando cada issue for entregue.
const plans: PlanCard[] = [
  {
    plan: "basic",
    tagline: "Preço certo, estoque e vendas sob controle.",
    available: [
      "Produtos com calculadora de preço e todos os custos",
      "Estoque com estoque mínimo e alerta",
      "Vendas com o lucro detalhado de cada uma",
      "Canais de venda com taxas e preço por canal",
      "Metas mensais, visão geral e projeção do mês",
      "Relatórios mensais em PDF e Excel",
      "Importação de produtos por planilha",
    ],
    comingSoon: [
      "Registro rápido de venda no celular",
      "Variações de produto (tamanho e cor)",
      "Catálogo público com pedido pelo WhatsApp",
      "Card \"Bati a meta\" para o story",
    ],
  },
  {
    plan: "pro",
    tagline: "Para quem quer o lucro real do negócio.",
    includesPrevious: "basic",
    available: [],
    comingSoon: [
      "Kits e combos",
      "Fiado e contas a receber com cobrança no WhatsApp",
      "Despesas fixas, lucro real e ponto de equilíbrio",
      "Clientes com histórico de compras",
      "Tráfego pago e ROAS",
      "Recibo de venda para compartilhar",
    ],
    highlighted: true,
  },
  {
    plan: "premium",
    tagline: "A inteligência artificial trabalhando por você.",
    includesPrevious: "pro",
    available: [],
    comingSoon: [
      "Registrar venda por áudio ou texto no WhatsApp",
      "Resumo semanal no WhatsApp",
      "Cadastro de produtos pela foto da nota",
      "Assistente que responde sobre os seus números",
      "Sugestão de preço com IA",
      "Legendas e descrições de produto",
    ],
  },
];

export default function PlanosPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Planos</h1>
            <p className="mt-3 text-muted-foreground">
              Assinatura mensal, sem fidelidade. Cancele quando quiser e use até o fim do mês pago.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((card) => (
              <section
                key={card.plan}
                aria-labelledby={`plano-${card.plan}`}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6 sm:p-8",
                  card.highlighted ? "border-primary shadow-lg" : "border-border"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`plano-${card.plan}`} className="text-xl font-bold text-foreground">
                    {PLAN_NAMES[card.plan]}
                  </h2>
                  {card.highlighted && <Badge>Mais completo</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{card.tagline}</p>
                <p className="mt-6">
                  <span className="text-4xl font-bold tabular-nums text-foreground">
                    {formatPrice(MONTHLY_PRICES[card.plan])}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </p>

                <Button asChild size="lg" variant={card.highlighted ? "primary" : "outline"} className="mt-6 w-full">
                  <Link href={`/checkout?plano=${card.plan}`}>Assinar o {PLAN_NAMES[card.plan]}</Link>
                </Button>

                {card.includesPrevious && (
                  <p className="mt-6 text-sm font-semibold text-foreground">
                    Tudo do {PLAN_NAMES[card.includesPrevious]}, mais:
                  </p>
                )}
                <ul className={cn("flex flex-col gap-2.5", card.includesPrevious ? "mt-3" : "mt-6")}>
                  {card.available.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> {item}
                    </li>
                  ))}
                  {card.comingSoon.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {item} <span className="text-xs font-medium">(em breve)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 text-center">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Garantia de 7 dias ou seu dinheiro de volta
            </p>
            <p className="text-sm text-muted-foreground">
              Já tem o plano Vitalício? Seu acesso continua para sempre.{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Entre na sua conta
              </Link>{" "}
              para ver o preço especial do Pro e do IA em Configurações.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
