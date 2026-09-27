"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePendingCheckout } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export function DeleteCheckoutButton({
  checkoutId,
  customerName,
}: {
  checkoutId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await deletePendingCheckout({ checkoutId });
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Remover
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Remover pagamento pendente"
        description={
          <>
            <p>O checkout de {customerName} será apagado do banco de dados.</p>
            <p>
              Se esse pagamento for aprovado depois (ex.: Pix ou boleto pago com atraso), o
              cliente não receberá o acesso automaticamente — use &quot;Liberar acesso&quot; em
              Clientes.
            </p>
          </>
        }
        confirmLabel="Remover"
        pendingLabel="Removendo..."
        destructive
        pending={pending}
        error={error}
        onConfirm={handleConfirm}
      />
    </>
  );
}
