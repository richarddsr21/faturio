import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagamentoRecusadoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="h-7 w-7" />
      </div>
      <h1 className="max-w-sm text-2xl font-semibold text-foreground">
        Não foi possível concluir seu pagamento.
      </h1>
      <Button asChild size="lg">
        <Link href="/checkout">Tentar novamente</Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        Precisa de ajuda?{" "}
        <a href="mailto:richarddsr21@gmail.com" className="underline">
          Fale com o suporte
        </a>
      </p>
    </main>
  );
}
