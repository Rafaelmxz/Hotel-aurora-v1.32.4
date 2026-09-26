/**
 * Ficha do bloqueio: criar ou remover.
 * Pode: quarto, datas, motivo curto, apagar.
 * Proibido: hóspede, folio, Pix, check-in.
 * Grava: blockStore.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { OnMapDialog } from "./OnMapDialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { addDays } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY_ISO, parseISODate, toISODate } from "@/mocks/hotelData";
import { useRooms } from "@/features/rooms/useRooms";
import { useReservations } from "./useReservations";
import { useBlocks, useCreateBlock, useRemoveBlock } from "./useBlocks";
import { findBlockConflicts, findConflicts } from "./overbooking";
import type { RoomBlock } from "./blockStore";

export type BlockDraft = {
  roomId: string;
  checkIn: string;
  checkOut: string;
};

export function BlockRoomModal({
  open,
  onOpenChange,
  draft,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: BlockDraft | null;
  existing: RoomBlock | null;
}) {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: blocks = [] } = useBlocks();
  const create = useCreateBlock();
  const remove = useRemoveBlock();
  const [roomId, setRoomId] = useState(draft?.roomId ?? rooms[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(draft?.checkIn ?? TODAY_ISO);
  const [checkOut, setCheckOut] = useState(
    draft?.checkOut ?? toISODate(addDays(parseISODate(TODAY_ISO), 1)),
  );
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setRoomId(existing.roomId);
      setCheckIn(existing.checkIn);
      setCheckOut(existing.checkOut);
      setReason(existing.reason);
      return;
    }
    setRoomId(draft?.roomId ?? rooms[0]?.id ?? "");
    setCheckIn(draft?.checkIn ?? TODAY_ISO);
    setCheckOut(draft?.checkOut ?? toISODate(addDays(parseISODate(TODAY_ISO), 1)));
    setReason("");
  }, [open, existing, draft, rooms]);

  const stayHits = useMemo(
    () => findConflicts(reservations, roomId, checkIn, checkOut),
    [reservations, roomId, checkIn, checkOut],
  );
  const blockHits = useMemo(
    () => findBlockConflicts(blocks, roomId, checkIn, checkOut, existing?.id),
    [blocks, roomId, checkIn, checkOut, existing?.id],
  );
  const busy = stayHits.length > 0 || blockHits.length > 0;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (existing) return;
    if (busy) {
      toast.error("Este quarto já está ocupado ou bloqueado neste período.");
      return;
    }
    try {
      await create.mutateAsync({ roomId, checkIn, checkOut, reason });
      toast.success("Quarto bloqueado no mapa e no site.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível bloquear.");
    }
  }

  async function onRemove() {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing.id);
      toast.success("Bloqueio removido. A vaga voltou a vender.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  return (
    <OnMapDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
          <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
            {existing ? "Bloqueio de quarto" : "Bloquear quarto"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            Não cria reserva, hóspede nem conta. Só tira a vaga da venda.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </DialogPrimitive.Close>
          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-room">Quarto</Label>
              <select
                id="block-room"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={roomId}
                disabled={Boolean(existing)}
                onChange={(event) => setRoomId(event.target.value)}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.number} · {room.type}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-in">Início</Label>
                <Input
                  id="block-in"
                  type="date"
                  value={checkIn}
                  disabled={Boolean(existing)}
                  onChange={(event) => setCheckIn(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-out">Fim</Label>
                <Input
                  id="block-out"
                  type="date"
                  value={checkOut}
                  disabled={Boolean(existing)}
                  onChange={(event) => setCheckOut(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-reason">Motivo</Label>
              <Input
                id="block-reason"
                maxLength={80}
                value={reason}
                disabled={Boolean(existing)}
                placeholder="Manutenção, evento, uso da casa…"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            {busy && !existing ? (
              <p className="text-sm text-destructive">Período cruzado com reserva ou outro bloqueio.</p>
            ) : null}
            {existing ? (
              <Button type="button" variant="destructive" onClick={() => void onRemove()}>
                Remover bloqueio
              </Button>
            ) : (
              <Button type="submit" disabled={create.isPending || busy}>
                Bloquear vaga
              </Button>
            )}
          </form>
    </OnMapDialog>
  );
}
