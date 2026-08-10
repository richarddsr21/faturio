import Link from "next/link";

export default function PagamentoRecusadoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Não foi possível concluir seu pagamento.</h1>
      <Link href="/checkout" className="rounded-md bg-black px-4 py-2 text-white">
        Tentar novamente
      </Link>
    </main>
  );
}
