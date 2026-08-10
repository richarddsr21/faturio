import { Clock } from "lucide-react";

export default function PagamentoPendentePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <Clock className="h-7 w-7" />
      </div>
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Estamos aguardando a confirmação do pagamento.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Assim que o pagamento for confirmado, você receberá um e-mail com o acesso.
        </p>
      </div>
    </main>
  );
}
