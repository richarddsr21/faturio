import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagamentoSucessoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">Pagamento confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          Seu acesso foi liberado. Enviamos um e-mail para você definir sua senha e entrar.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">Acessar minha dashboard</Link>
      </Button>
    </main>
  );
}
