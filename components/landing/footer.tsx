import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>Faturio</p>
        <div className="flex items-center gap-6">
          <a href="mailto:richarddsr21@gmail.com" className="transition-colors hover:text-foreground">
            Suporte
          </a>
          <Link href="/termos-de-uso" className="transition-colors hover:text-foreground">
            Termos de Uso
          </Link>
          <Link href="/politica-de-privacidade" className="transition-colors hover:text-foreground">
            Política de Privacidade
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Faturio. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
