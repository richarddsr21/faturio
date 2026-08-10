import { AlertTriangle } from "lucide-react";

const products = [
  { name: "Tênis Premium", stock: 32, low: false },
  { name: "Camisa Oversized", stock: 12, low: false },
  { name: "Calça Cargo", stock: 4, low: true },
];

export function StockShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="order-2 rounded-2xl border border-border bg-card p-6 lg:order-1">
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li
              key={product.name}
              className="flex items-center justify-between rounded-[10px] border border-border px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">{product.name}</span>
              <span
                className={
                  product.low
                    ? "flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"
                    : "text-sm tabular-nums text-muted-foreground"
                }
              >
                {product.low && <AlertTriangle className="h-3.5 w-3.5" />}
                {product.stock} un.
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 lg:order-2">
        <h3 className="text-2xl font-semibold text-foreground">Estoque</h3>
        <p className="mt-2 text-muted-foreground">
          Saiba exatamente quanto você tem de cada produto — e receba um aviso antes de faltar.
        </p>
      </div>
    </div>
  );
}
