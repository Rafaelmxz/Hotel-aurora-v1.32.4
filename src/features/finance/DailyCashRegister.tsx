import { useMemo, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TODAY, TODAY_ISO, formatCurrency, roomById } from "@/mocks/hotelData";
import { useProperty } from "@/features/settings/useProperty";
import { useReservations } from "@/features/reservations/useReservations";
import {
  METODO_PAGAMENTO_LABEL,
  type MetodoPagamento,
} from "@/features/reservations/types/folio";
import { useCloseCash, useDailyCash } from "./useCash";
import { cn } from "@/lib/utils";

const METHODS: MetodoPagamento[] = [
  "pix",
  "cartao_credito",
  "cartao_debito",
  "dinheiro",
];

export function DailyCashRegister() {
  const { payments, totals, close, isClosed } = useDailyCash(TODAY_ISO);
  const { data: reservations = [] } = useReservations();
  const { data: property } = useProperty();
  const closeMutation = useCloseCash(TODAY_ISO);
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");

  const reservationById = useMemo(() => {
    return new Map(reservations.map((row) => [row.id, row]));
  }, [reservations]);

  const countedValue = Number(counted.replace(",", "."));
  const countedOk = Number.isFinite(countedValue) && countedValue >= 0;
  const difference = countedOk ? countedValue - totals.dinheiro : 0;

  async function onClose(event: FormEvent) {
    event.preventDefault();
    if (!countedOk) return;
    try {
      await closeMutation.mutateAsync({
        countedCash: countedValue,
        notes,
      });
      toast.success("Caixa encerrado");
      setOpen(false);
    } catch {
      toast.error("Não foi possível encerrar o caixa.");
    }
  }

  function printReport() {
    window.print();
  }

  function exportReport() {
    const lines = [
      `${property.name} — Fechamento de caixa`,
      format(TODAY, "dd/MM/yyyy", { locale: ptBR }),
      "",
      ...METHODS.map(
        (method) => `${METODO_PAGAMENTO_LABEL[method]}: ${formatCurrency(totals[method])}`,
      ),
      `Total: ${formatCurrency(totals.total)}`,
      `Dinheiro no sistema: ${formatCurrency(totals.dinheiro)}`,
      close
        ? `Dinheiro contado: ${formatCurrency(close.countedCash)}\nDiferença: ${formatCurrency(close.difference)}\n${close.notes ?? ""}`
        : "Status: aberto",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caixa-${TODAY_ISO}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Financeiro
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">Caixa do dia</h1>
          <p className="text-sm text-muted-foreground">
            {format(TODAY, "EEEE, d 'de' MMMM", { locale: ptBR })}
            {isClosed ? " · fechado" : " · aberto"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportReport}>
            Exportar
          </Button>
          <Button variant="outline" onClick={printReport}>
            <Printer className="size-4" />
            Imprimir
          </Button>
          <Button disabled={isClosed} onClick={() => setOpen(true)}>
            Encerrar caixa
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5">
        {METHODS.map((method) => (
          <Card key={method}>
            <CardContent className="pt-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {METODO_PAGAMENTO_LABEL[method]}
              </p>
              <p className="font-display mt-2 text-2xl font-medium tracking-tight tabular-nums">
                {formatCurrency(totals[method])}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-1">
            <p className="text-xs font-medium tracking-wide uppercase opacity-80">Total</p>
            <p className="font-display mt-2 text-2xl font-medium tracking-tight tabular-nums">
              {formatCurrency(totals.total)}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="overflow-x-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Hóspede</th>
              <th className="px-4 py-3 font-medium">Quarto</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum pagamento hoje.
                </td>
              </tr>
            ) : (
              payments
                .slice()
                .sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""))
                .map((item) => {
                  const reservation = reservationById.get(item.reserva_id);
                  const room = reservation ? roomById(reservation.roomId) : undefined;
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3 tabular-nums">{item.hora ?? "—"}</td>
                      <td className="px-4 py-3">{reservation?.guestName ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{room?.number ?? "—"}</td>
                      <td className="px-4 py-3">{METODO_PAGAMENTO_LABEL[item.metodo]}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(item.valor)}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </section>

      {close ? (
        <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Fechamento
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <dt className="text-muted-foreground">Dinheiro no sistema</dt>
            <dd className="tabular-nums sm:text-right">{formatCurrency(close.systemCash)}</dd>
            <dt className="text-muted-foreground">Dinheiro contado</dt>
            <dd className="tabular-nums sm:text-right">{formatCurrency(close.countedCash)}</dd>
            <dt className="text-muted-foreground">Diferença</dt>
            <dd
              className={cn(
                "tabular-nums sm:text-right",
                close.difference !== 0 && "text-status-pending",
              )}
            >
              {formatCurrency(close.difference)}
              {close.difference > 0 ? " · sobra" : close.difference < 0 ? " · falta" : " · conferido"}
            </dd>
          </dl>
          {close.notes ? <p className="mt-3 text-sm">{close.notes}</p> : null}
        </section>
      ) : null}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/40" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
            <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
              Encerrar caixa do dia
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              Compare o dinheiro da gaveta com o registrado no sistema.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 hover:opacity-100">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
            <form onSubmit={onClose} className="mt-5 grid gap-3">
              <p className="text-sm">
                Dinheiro no sistema:{" "}
                <span className="font-medium tabular-nums">{formatCurrency(totals.dinheiro)}</span>
              </p>
              <div className="grid gap-2">
                <Label htmlFor="counted-cash">Valor contado na gaveta</Label>
                <Input
                  id="counted-cash"
                  required
                  inputMode="decimal"
                  value={counted}
                  onChange={(event) => setCounted(event.target.value)}
                  placeholder={String(totals.dinheiro)}
                />
              </div>
              {countedOk ? (
                <p className={cn("text-sm", difference !== 0 && "text-status-pending")}>
                  Diferença: {formatCurrency(difference)}
                  {difference > 0 ? " (sobra / troco)" : difference < 0 ? " (falta / sangria)" : " (bateu)"}
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="cash-notes">Observações do turno</Label>
                <Textarea
                  id="cash-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder='Ex.: sobrou R$ 2,00 no troco'
                />
              </div>
              <Button type="submit" disabled={closeMutation.isPending || !countedOk}>
                Confirmar fechamento
              </Button>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
