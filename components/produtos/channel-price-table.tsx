import { AlertTriangle } from "lucide-react";
import { calculateChannelPrice } from "@/lib/finance/pricing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MarginPill } from "@/components/ui/margin-pill";
import { cn } from "@/lib/utils";

export interface ChannelPriceTableChannel {
  id: string;
  name: string;
  /** Fração (0,14 = 14%). */
  commission: number;
  /** R$ por peça. */
  fixedFee: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "Preço ideal por canal" do produto (#15): recalcula a cada mudança no formulário. */
export function ChannelPriceTable({
  channels,
  unitCosts,
  adminFee,
  desiredMargin,
  currentPrice,
}: {
  channels: ChannelPriceTableChannel[];
  unitCosts: number;
  adminFee: number;
  desiredMargin: number;
  currentPrice: number | null;
}) {
  if (channels.length === 0) return null;

  const rows = channels.map((channel) => ({
    channel,
    ...calculateChannelPrice({ unitCosts, adminFee, channel, desiredMargin, currentPrice }),
  }));
  const belowCount = rows.filter((row) => row.belowDesired).length;
  const marginLabel = `${(desiredMargin * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

  return (
    <section aria-labelledby="channel-prices-title" className="rounded-card border border-border bg-card p-4">
      <h2 id="channel-prices-title" className="text-sm font-bold text-foreground">
        Preço ideal por canal
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Quanto cobrar em cada canal para manter {marginLabel} de margem desejada
        {currentPrice ? `, e quanto sobra vendendo a ${formatCurrency(currentPrice)}` : ""}. Em cada canal vale a
        comissão dele no lugar da taxa de cartão; o tráfego pago não entra.
      </p>

      {currentPrice !== null && belowCount > 0 && (
        <p className="mt-3 flex items-start gap-1.5 rounded-control bg-warning/15 px-3 py-2 text-xs font-medium text-warning">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {belowCount === 1
            ? "Em 1 canal o preço atual fica abaixo da margem desejada."
            : `Em ${belowCount} canais o preço atual fica abaixo da margem desejada.`}
        </p>
      )}

      <Table className="mt-3">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Canal</TableHead>
            <TableHead className="text-right">Preço sugerido</TableHead>
            <TableHead className="text-right">Lucro por peça</TableHead>
            <TableHead className="text-right">Margem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ channel, suggestedPrice, profit, margin, belowDesired }) => (
            <TableRow key={channel.id} className={cn(currentPrice !== null && belowDesired && "bg-warning/5")}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-1.5">
                  {currentPrice !== null && belowDesired && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Abaixo da margem desejada" />
                  )}
                  {channel.name}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                {suggestedPrice !== null ? formatCurrency(suggestedPrice) : "—"}
              </TableCell>
              <TableCell
                className={cn("text-right font-mono", profit !== null && profit < 0 ? "text-destructive" : "text-primary")}
              >
                {profit !== null ? formatCurrency(profit) : "—"}
              </TableCell>
              <TableCell className="text-right">
                {margin !== null ? <MarginPill margin={margin} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.some((row) => row.suggestedPrice === null) && (
        <p className="mt-2 text-xs text-muted-foreground">
          &quot;—&quot; no preço sugerido: as taxas desse canal somam 100% ou mais.
        </p>
      )}
    </section>
  );
}
