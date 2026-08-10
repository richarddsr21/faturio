export default function PagamentoPendentePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Estamos aguardando a confirmação do pagamento.</h1>
      <p className="text-muted-foreground">
        Assim que o pagamento for confirmado, você receberá um e-mail com o acesso.
      </p>
    </main>
  );
}
