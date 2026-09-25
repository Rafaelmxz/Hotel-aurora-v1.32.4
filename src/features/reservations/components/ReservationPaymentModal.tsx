import { useEffect, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/mocks/hotelData";
import { useFolio } from "../hooks/useFolio";
import {
  METODO_PAGAMENTO_LABEL,
  type MetodoPagamento,
} from "../types/folio";
import { useProperty } from "@/features/settings/useProperty";
import { PixCharge } from "@/features/finance/PixCharge";
import { pixTxid } from "@/lib/pix/brcode";

const METODOS: MetodoPagamento[] = [
  "pix",
  "cartao_credito",
  "cartao_debito",
  "dinheiro",
];

export function ReservationPaymentModal({
  reservationId,
  guestName,
  open,
  onOpenChange,
  onSettled,
}: {
  reservationId: string;
  guestName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettled?: (saldo: number) => void;
}) {
  const folio = useFolio(reservationId);
  const { data: property } = useProperty();
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [observacao, setObservacao] = useState("");

  const saldo = folio.totais.saldo;
  const parsedValor = Number(valor.replace(",", "."));
  const pixAmount = Number.isFinite(parsedValor) && parsedValor > 0 ? parsedValor : saldo;

  useEffect(() => {
    if (open) setValor(saldo > 0 ? String(saldo) : "");
  }, [open, saldo]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(valor.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    try {
      await folio.addPayment.mutateAsync({
        valor: parsed,
        metodo,
        observacao:
          metodo === "pix"
            ? [observacao.trim(), `Pix ${pixTxid(`${reservationId}-${parsed}`)}`].filter(Boolean).join(" · ")
            : observacao.trim() || undefined,
      });
      const nextSaldo = getSaldoAfter(saldo, parsed);
      toast.success(`Pagamento de ${formatCurrency(parsed)} registrado`);
      setObservacao("");
      onSettled?.(nextSaldo);
      if (nextSaldo <= 0) onOpenChange(false);
      else setValor(String(nextSaldo));
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/40" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onFocusOutside={(event) => event.preventDefault()}
          className="fixed top-1/2 left-1/2 z-[70] flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg"
        >
          <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
            Pagamento e fechamento
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            {guestName} · quite o saldo para liberar o check-out
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>

          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Diárias</dt>
            <dd className="text-right tabular-nums">{formatCurrency(folio.totais.totalDiarias)}</dd>
            <dt className="text-muted-foreground">Consumos</dt>
            <dd className="text-right tabular-nums">{formatCurrency(folio.totais.totalConsumo)}</dd>
            <dt className="text-muted-foreground">Pagamentos</dt>
            <dd className="text-right tabular-nums">
              − {formatCurrency(folio.totais.totalPagamentos)}
            </dd>
          </dl>
          <div className="mt-3 rounded-xl bg-secondary px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Saldo devedor
            </p>
            <p className="font-display mt-1 text-2xl font-medium tracking-tight tabular-nums">
              {formatCurrency(saldo)}
            </p>
          </div>

          {folio.pagamentos.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm">
              {folio.pagamentos.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {METODO_PAGAMENTO_LABEL[item.metodo]}
                    {item.observacao ? ` · ${item.observacao}` : ""}
                  </span>
                  <span className="tabular-nums">{formatCurrency(item.valor)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
            <div className="grid gap-2">
              <Label htmlFor="pay-valor">Valor a pagar</Label>
              <div className="flex gap-2">
                <Input
                  id="pay-valor"
                  required
                  inputMode="decimal"
                  value={valor}
                  onChange={(event) => setValor(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={saldo <= 0}
                  onClick={() => setValor(String(saldo))}
                >
                  Saldo total
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {METODOS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMetodo(option)}
                    className={
                      metodo === option
                        ? "h-10 rounded-md border-2 border-primary bg-primary/10 px-2 text-sm font-medium"
                        : "h-10 rounded-md border border-input bg-card px-2 text-sm"
                    }
                  >
                    {METODO_PAGAMENTO_LABEL[option]}
                  </button>
                ))}
              </div>
            </div>
            {metodo === "pix" && pixAmount > 0 ? (
              <PixCharge
                amount={pixAmount}
                pixKey={property.pixKey}
                payee={property.pixPayee || property.name}
                address={property.address}
                seed={`${reservationId}-${pixAmount}`}
                description={`Folio ${guestName}`}
              />
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="pay-obs">Observação</Label>
              <Textarea
                id="pay-obs"
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button type="submit" disabled={folio.addPayment.isPending || saldo <= 0}>
              {metodo === "pix" ? "Registrar Pix recebido" : "Registrar pagamento"}
            </Button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function getSaldoAfter(saldo: number, pago: number) {
  return Math.max(0, Math.round(saldo - pago));
}
