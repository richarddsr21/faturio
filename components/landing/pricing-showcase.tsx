const rows = [
  { label: "Custo", value: "R$ 50,00" },
  { label: "Embalagem", value: "R$ 2,00" },
  { label: "Frete", value: "R$ 5,00" },
  { label: "Taxas", value: "R$ 4,00" },
  { label: "Margem desejada", value: "30%" },
];

export function PricingShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-2xl font-semibold text-foreground">Precificação</h3>
        <p className="mt-2 text-muted-foreground">
          Informe seus custos e a margem desejada — o Faturio calcula o preço de venda ideal.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Tênis Premium</p>
        <dl className="flex flex-col gap-2.5 border-b border-border pb-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium tabular-nums text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Preço recomendado</span>
          <span className="text-2xl font-bold tabular-nums text-primary">R$ 87,14</span>
        </div>
      </div>
    </div>
  );
}
