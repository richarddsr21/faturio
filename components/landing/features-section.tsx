import {
  Calculator,
  Package,
  Boxes,
  ShoppingCart,
  Target,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  { icon: Calculator, title: "Precificação", description: "Descubra quanto cobrar." },
  { icon: Package, title: "Produtos", description: "Tenha todos os produtos organizados." },
  { icon: Boxes, title: "Estoque", description: "Saiba quanto ainda possui." },
  { icon: ShoppingCart, title: "Vendas", description: "Registre e acompanhe suas vendas." },
  { icon: Target, title: "Metas", description: "Saiba exatamente quanto falta." },
  { icon: TrendingUp, title: "Lucro", description: "Entenda quanto realmente ganhou." },
  { icon: BarChart3, title: "Relatórios", description: "Compare meses e exporte em PDF ou Excel." },
  {
    icon: FileSpreadsheet,
    title: "Importação por planilha",
    description: "Traga seus produtos do Excel sem redigitar nada.",
  },
  { icon: Users, title: "Clientes", description: "Saiba quem comprou e encontre qualquer venda." },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Tudo que o seu negócio precisa
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
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
