import { ArrowDown, CheckCircle2, FileSpreadsheet } from "lucide-react";

const rows = [
  { name: "Tênis Premium", cost: "50,00", stock: "32" },
  { name: "Camisa Oversized", cost: "28,00", stock: "12" },
  { name: "Calça Cargo", cost: "45,00", stock: "4" },
];

export function ImportShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="order-2 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 lg:order-1">
        <div className="w-full overflow-hidden rounded-[10px] border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5 text-success" /> meus-produtos.xlsx
          </div>
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Custo</th>
                <th className="px-4 py-2 font-medium">Estoque</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-foreground">
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2">{row.cost}</td>
                  <td className="px-4 py-2">{row.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ArrowDown className="h-5 w-5 text-primary" />
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" /> 3 produtos importados
        </p>
      </div>
      <div className="order-1 lg:order-2">
        <h3 className="text-2xl font-semibold text-foreground">Importação por planilha</h3>
        <p className="mt-2 text-muted-foreground">
          Já controla tudo numa planilha? Envie o arquivo Excel ou CSV e seus produtos entram no
          Faturio com custo, preço, estoque e margem, sem redigitar nada.
        </p>
      </div>
    </div>
  );
}
