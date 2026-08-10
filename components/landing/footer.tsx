export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>Faturio</p>
        <p>&copy; {new Date().getFullYear()} Faturio. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
