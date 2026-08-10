import Link from "next/link";

export default function PagamentoSucessoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Pagamento confirmado!</h1>
      <p className="text-muted-foreground">
        Seu acesso foi liberado. Enviamos um e-mail para você definir sua senha e entrar.
      </p>
      <Link href="/login" className="rounded-md bg-black px-4 py-2 text-white">
        Acessar minha dashboard
      </Link>
    </main>
  );
}
