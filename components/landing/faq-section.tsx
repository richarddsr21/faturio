import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "É realmente pagamento único, sem mensalidade?",
    answer: "Sim. Você paga uma vez R$ 5,00 e tem acesso vitalício ao Faturio.",
  },
  {
    question: "Preciso entender de finanças pra usar o Faturio?",
    answer:
      "Não. O Faturio foi pensado para quem nunca trabalhou com planilhas ou controle financeiro — os cálculos são feitos por você.",
  },
  {
    question: "Meus dados ficam isolados dos de outros clientes?",
    answer:
      "Sim. Cada conta tem seus próprios dados, completamente isolados dos demais clientes da plataforma.",
  },
  {
    question: "Funciona pra qualquer tipo de produto ou nicho?",
    answer:
      "Sim. O Faturio funciona para qualquer negócio que venda produtos físicos, seja pelo Instagram, WhatsApp ou uma loja online.",
  },
  {
    question: "Dá pra usar pelo celular?",
    answer: "Sim, o Faturio funciona no navegador do seu celular, sem precisar instalar nada.",
  },
  {
    question: "Como funciona o suporte?",
    answer: "Nosso suporte é feito por e-mail, e responde o mais rápido possível.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Perguntas frequentes
        </h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
