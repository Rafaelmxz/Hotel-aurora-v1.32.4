/**
 * Cadastro de bloqueio e fechamento de venda na aba Hotel.
 * Pode: criar, listar, desbloquear quarto, reabrir venda.
 * Proibido: reserva, hóspede, folio, Pix, preço, OTA, Experiências.
 * Grava: blockStore e saleCloseStore (cofre).
 * Mapa e site só leem o resultado.
 */
import { useMemo, useState, type FormEvent } from "react";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY_ISO, parseISODate, toISODate, type RoomType } from "@/mocks/hotelData";
import { useRooms } from "@/features/rooms/useRooms";
import { useReservations } from "@/features/reservations/useReservations";
import { findBlockConflicts, findConflicts } from "@/features/reservations/overbooking";
import { useBlocks, useCreateBlock, useRemoveBlock } from "@/features/reservations/useBlocks";
import {
  useCreateSaleClose,
  useRemoveSaleClose,
  useSaleCloses,
} from "@/features/reservations/useSaleCloses";

const TYPES: Array<RoomType | "todas"> = ["todas", "Standard", "Luxo", "Suíte"];

function periodLabel(checkIn: string, checkOut: string) {
  return `${checkIn} → ${checkOut}`;
}

export function InventoryHoldsPanel() {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: blocks = [] } = useBlocks();
  const { data: saleCloses = [] } = useSaleCloses();
  const createBlock = useCreateBlock();
  const removeBlock = useRemoveBlock();
  const createClose = useCreateSaleClose();
  const removeClose = useRemoveSaleClose();

  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [blockIn, setBlockIn] = useState(TODAY_ISO);
  const [blockOut, setBlockOut] = useState(toISODate(addDays(parseISODate(TODAY_ISO), 1)));
  const [blockReason, setBlockReason] = useState("");

  const [roomType, setRoomType] = useState<RoomType | "todas">("todas");
  const [closeIn, setCloseIn] = useState(TODAY_ISO);
  const [closeOut, setCloseOut] = useState(toISODate(addDays(parseISODate(TODAY_ISO), 1)));
  const [closeReason, setCloseReason] = useState("");

  const selectedRoomId = roomId || rooms[0]?.id || "";
  const stayHits = useMemo(
    () => findConflicts(reservations, selectedRoomId, blockIn, blockOut),
    [reservations, selectedRoomId, blockIn, blockOut],
  );
  const blockHits = useMemo(
    () => findBlockConflicts(blocks, selectedRoomId, blockIn, blockOut),
    [blocks, selectedRoomId, blockIn, blockOut],
  );
  const blockBusy = stayHits.length > 0 || blockHits.length > 0;

  async function onBlock(event: FormEvent) {
    event.preventDefault();
    if (blockBusy) {
      toast.error("Este quarto já está ocupado ou bloqueado neste período.");
      return;
    }
    try {
      await createBlock.mutateAsync({
        roomId: selectedRoomId,
        checkIn: blockIn,
        checkOut: blockOut,
        reason: blockReason,
      });
      setBlockReason("");
      toast.success("Quarto bloqueado. Some no mapa e no site.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível bloquear.");
    }
  }

  async function onCloseSale(event: FormEvent) {
    event.preventDefault();
    try {
      await createClose.mutateAsync({
        roomType,
        checkIn: closeIn,
        checkOut: closeOut,
        reason: closeReason,
      });
      setCloseReason("");
      toast.success("Venda fechada neste tipo e período.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar a venda.");
    }
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">Bloqueio de quarto</h2>
          <p className="text-sm text-muted-foreground">
            Tira um quarto da venda. Não cria reserva, hóspede nem conta.
          </p>
        </div>
        <form className="grid gap-3" onSubmit={onBlock}>
          <div className="grid gap-2">
            <Label htmlFor="hotel-block-room">Quarto</Label>
            <select
              id="hotel-block-room"
              className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              value={selectedRoomId}
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
            <div className="grid gap-2">
              <Label htmlFor="hotel-block-in">De</Label>
              <Input
                id="hotel-block-in"
                type="date"
                value={blockIn}
                onChange={(event) => setBlockIn(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hotel-block-out">Até (saída)</Label>
              <Input
                id="hotel-block-out"
                type="date"
                value={blockOut}
                onChange={(event) => setBlockOut(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotel-block-reason">Motivo</Label>
            <Input
              id="hotel-block-reason"
              maxLength={80}
              value={blockReason}
              placeholder="Manutenção, evento, uso da casa…"
              onChange={(event) => setBlockReason(event.target.value)}
            />
          </div>
          {blockBusy ? (
            <p className="text-sm text-destructive">Período cruzado com reserva ou outro bloqueio.</p>
          ) : null}
          <Button type="submit" className="self-start" disabled={createBlock.isPending || blockBusy}>
            Bloquear quarto
          </Button>
        </form>
        <ul className="grid gap-2">
          {blocks.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nenhum quarto bloqueado.</li>
          ) : (
            blocks.map((row) => {
              const room = rooms.find((item) => item.id === row.roomId);
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {room ? `${room.number} · ${room.type}` : row.roomId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {periodLabel(row.checkIn, row.checkOut)} · {row.reason}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={removeBlock.isPending}
                    onClick={() => {
                      void removeBlock
                        .mutateAsync(row.id)
                        .then(() => toast.success("Quarto desbloqueado."))
                        .catch((error: unknown) =>
                          toast.error(error instanceof Error ? error.message : "Não foi possível desbloquear."),
                        );
                    }}
                  >
                    Desbloquear
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">Fechar venda por data</h2>
          <p className="text-sm text-muted-foreground">
            Fecha o tipo no mapa e no site. Não muda preço e não cria reserva.
          </p>
        </div>
        <form className="grid gap-3" onSubmit={onCloseSale}>
          <div className="grid gap-2">
            <Label htmlFor="hotel-close-type">Tipo</Label>
            <select
              id="hotel-close-type"
              className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              value={roomType}
              onChange={(event) => setRoomType(event.target.value as RoomType | "todas")}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "todas" ? "Todos os tipos" : type}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="hotel-close-in">De</Label>
              <Input
                id="hotel-close-in"
                type="date"
                value={closeIn}
                onChange={(event) => setCloseIn(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hotel-close-out">Até (saída)</Label>
              <Input
                id="hotel-close-out"
                type="date"
                value={closeOut}
                onChange={(event) => setCloseOut(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotel-close-reason">Motivo</Label>
            <Input
              id="hotel-close-reason"
              maxLength={80}
              value={closeReason}
              placeholder="Manutenção da categoria, evento…"
              onChange={(event) => setCloseReason(event.target.value)}
            />
          </div>
          <Button type="submit" className="self-start" disabled={createClose.isPending}>
            Fechar venda
          </Button>
        </form>
        <ul className="grid gap-2">
          {saleCloses.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nenhuma venda fechada.</li>
          ) : (
            saleCloses.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {row.roomType === "todas" ? "Todos os tipos" : row.roomType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {periodLabel(row.checkIn, row.checkOut)} · {row.reason}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={removeClose.isPending}
                  onClick={() => {
                    void removeClose
                      .mutateAsync(row.id)
                      .then(() => toast.success("Venda reaberta."))
                      .catch((error: unknown) =>
                        toast.error(error instanceof Error ? error.message : "Não foi possível reabrir."),
                      );
                  }}
                >
                  Reabrir venda
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
