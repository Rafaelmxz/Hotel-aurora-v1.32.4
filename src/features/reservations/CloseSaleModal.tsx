/**
 * Fecha venda por tipo e datas. Lista os fechamentos para reabrir.
 * Pode: tipo, período, motivo, clicar na lista e liberar.
 * Proibido: preço, reserva, folio.
 * Grava: saleCloseStore.
 */
import { useEffect, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { OnMapDialog } from "./OnMapDialog";
import { addDays } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY_ISO, parseISODate, toISODate, type RoomType } from "@/mocks/hotelData";
import { useCreateSaleClose, useRemoveSaleClose, useSaleCloses } from "./useSaleCloses";
import type { SaleClose } from "./saleCloseStore";

const TYPES: Array<RoomType | "todas"> = ["todas", "Standard", "Luxo", "Suíte"];

function typeLabel(value: SaleClose["roomType"]) {
  return value === "todas" ? "Todos os tipos" : value;
}

export function CloseSaleModal({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SaleClose | null;
}) {
  const { data: closes = [] } = useSaleCloses();
  const create = useCreateSaleClose();
  const remove = useRemoveSaleClose();
  const [roomType, setRoomType] = useState<RoomType | "todas">("todas");
  const [checkIn, setCheckIn] = useState(TODAY_ISO);
  const [checkOut, setCheckOut] = useState(toISODate(addDays(parseISODate(TODAY_ISO), 1)));
  const [reason, setReason] = useState("");

  const rows = [...closes].sort(
    (a, b) => a.checkIn.localeCompare(b.checkIn) || a.roomType.localeCompare(b.roomType),
  );

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setRoomType(existing.roomType);
      setCheckIn(existing.checkIn);
      setCheckOut(existing.checkOut);
      setReason(existing.reason);
      return;
    }
    setRoomType("todas");
    setCheckIn(TODAY_ISO);
    setCheckOut(toISODate(addDays(parseISODate(TODAY_ISO), 1)));
    setReason("");
  }, [open, existing]);

  function resetForm() {
    setRoomType("todas");
    setCheckIn(TODAY_ISO);
    setCheckOut(toISODate(addDays(parseISODate(TODAY_ISO), 1)));
    setReason("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({ roomType, checkIn, checkOut, reason });
      toast.success("Venda fechada neste tipo e período.");
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar a venda.");
    }
  }

  async function onRelease(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Venda reaberta neste período.");
      if (existing?.id === id) resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reabrir.");
    }
  }

  return (
    <OnMapDialog open={open} onOpenChange={onOpenChange} className="max-w-md p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <DialogPrimitive.Title className="font-display text-xl font-medium">
            Fechar venda
          </DialogPrimitive.Title>
          <p className="text-sm text-muted-foreground">
            Fecha o tipo no mapa e no site. Clique na lista para liberar.
          </p>
        </div>
        <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="close-type">Tipo</Label>
          <select
            id="close-type"
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
            value={roomType}
            onChange={(event) => setRoomType(event.target.value as RoomType | "todas")}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="close-in">De</Label>
            <Input
              id="close-in"
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="close-out">Até (saída)</Label>
            <Input
              id="close-out"
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="close-reason">Motivo</Label>
          <Input
            id="close-reason"
            maxLength={80}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Manutenção da categoria, evento…"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Fechar venda
        </Button>
      </form>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Datas fechadas
        </p>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma venda fechada.</p>
        ) : (
          <ul className="mt-2 grid max-h-40 gap-1 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                  onClick={() => void onRelease(row.id)}
                >
                  <span>
                    {typeLabel(row.roomType)} · {row.checkIn} → {row.checkOut}
                    <span className="block text-xs text-muted-foreground">{row.reason}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-destructive">Liberar</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </OnMapDialog>
  );
}
