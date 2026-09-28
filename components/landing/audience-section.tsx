import { Camera, MessageCircle, Store } from "lucide-react";
import { Card } from "@/components/ui/card";

const audiences = [
  {
    icon: Camera,
    title: "Vende pelo Instagram",
    description: "Saiba o preço certo de cada peça antes de postar e quanto lucrou no fim do mês.",
  },
  {
    icon: MessageCircle,
    title: "Vende pelo WhatsApp",
    description: "Registre cada pedido em segundos, com o nome do cliente, e pare de anotar no caderno.",
  },
  {
    icon: Store,
    title: "Tem loja online ou física",
    description: "Controle o estoque, receba aviso antes de faltar produto e acompanhe suas metas.",
  },
];

export function AudienceSection() {
  return (
    <section id="para-quem" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Feito para quem vende produtos
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Qualquer nicho, qualquer canal. Se você compra, revende ou fabrica, o Faturio mostra
          quanto cobrar e quanto sobra no seu bolso.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {audiences.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
