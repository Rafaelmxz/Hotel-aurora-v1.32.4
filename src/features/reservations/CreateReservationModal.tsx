import { useMemo, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { addDays, format } from "date-fns";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY, TODAY_ISO, formatCurrency, roomById } from "@/mocks/hotelData";
import { GuestSearch } from "@/features/guests/GuestSearch";
import type { Guest } from "@/features/guests/guestStore";
import { useRooms } from "@/features/rooms/useRooms";
import { cn } from "@/lib/utils";
import { quoteNewReservation } from "./reservationStore";
import { useCreateReservation, useReservations } from "./useReservations";
import {
  OverbookingError,
  blockedNightsForRoom,
  findAlternativeRooms,
  findConflicts,
} from "./overbooking";

export function CreateReservationModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const create = useCreateReservation();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(TODAY_ISO);
  const [checkOut, setCheckOut] = useState(TODAY_ISO);

  const blocked = useMemo(
    () => blockedNightsForRoom(reservations, roomId),
    [reservations, roomId],
  );
  const conflicts = useMemo(
    () => findConflicts(reservations, roomId, checkIn, checkOut),
    [reservations, roomId, checkIn, checkOut],
  );
  const alternatives = useMemo(
    () => findAlternativeRooms(reservations, roomId, checkIn, checkOut),
    [reservations, roomId, checkIn, checkOut],
  );
  const previewDays = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(TODAY, index)),
    [],
  );

  const quote = useMemo(() => {
    if (!roomId || !checkIn || !checkOut) return null;
    try {
      return quoteNewReservation(roomId, checkIn, checkOut);
    } catch {
      return null;
    }
  }, [roomId, checkIn, checkOut]);

  function applyGuest(next: Guest) {
    setGuest(next);
    setName(next.name);
    setEmail(next.email);
    if (next.tags.includes("Inadimplente") || next.preferences.length) {
      toast.warning(
        `${next.name}: ${[...next.tags, ...next.preferences].slice(0, 3).join(" · ")}`,
      );
    }
  }

  function pickDate(iso: string, field: "in" | "out") {
    if (field === "in" && blocked.has(iso)) {
      toast.error("Esta data já está ocupada neste quarto.");
      return;
    }
    if (field === "in") setCheckIn(iso);
    else setCheckOut(iso);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (conflicts.length > 0) {
      toast.error("Overbooking: escolha outro quarto ou período.");
      return;
    }
    try {
      await create.mutateAsync({
        roomId,
        guestName: name,
        guestEmail: email,
        checkIn,
        checkOut,
        notes: guest?.preferences.join("; "),
      });
      toast.success(`Reserva criada · ${name}`);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof OverbookingError || error instanceof Error
          ? error.message
          : "Não foi possível criar a reserva.";
      toast.error(message);
    }
  }

  const selectedRoom = roomById(roomId);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/40" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[70] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6">
          <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
            Nova reserva
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            Datas ocupadas ficam bloqueadas para evitar overbooking.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 hover:opacity-100">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label>Busca de hóspede</Label>
              <GuestSearch onSelect={applyGuest} />
            </div>
            {guest && (guest.preferences.length > 0 || guest.tags.length > 0) ? (
              <div className="flex gap-2 rounded-lg bg-status-pending/10 px-3 py-3 text-sm text-status-pending">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  {guest.tags.join(" · ")}
                  {guest.preferences.length ? ` · ${guest.preferences.join(" · ")}` : ""}
                </p>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="new-name">Hóspede</Label>
              <Input id="new-name" required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-email">E-mail</Label>
              <Input id="new-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-room">Quarto</Label>
              <select
                id="new-room"
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.number} · {room.type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Disponibilidade (14 dias)
              </p>
              <div className="flex flex-wrap gap-1">
                {previewDays.map((day) => {
                  const iso = format(day, "yyyy-MM-dd");
                  const taken = blocked.has(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={taken}
                      onClick={() => pickDate(iso, "in")}
                      className={cn(
                        "size-9 rounded-md text-xs tabular-nums",
                        taken
                          ? "cursor-not-allowed bg-destructive/15 text-destructive line-through"
                          : iso === checkIn
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary",
                      )}
                      title={taken ? "Ocupado" : iso}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  required
                  min={TODAY_ISO}
                  value={checkIn}
                  onChange={(event) => pickDate(event.target.value, "in")}
                />
              </div>
              <div className="grid gap-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  required
                  min={checkIn}
                  value={checkOut}
                  onChange={(event) => pickDate(event.target.value, "out")}
                />
              </div>
            </div>

            {conflicts.length > 0 ? (
              <div className="rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
                <p className="font-medium">Conflito / overbooking</p>
                <p>
                  {selectedRoom?.number} já tem {conflicts.length} reserva(s) neste intervalo.
                </p>
                {alternatives.length > 0 ? (
                  <p className="mt-2">
                    Quartos livres na categoria {selectedRoom?.type}:{" "}
                    {alternatives.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        className="mr-2 underline"
                        onClick={() => setRoomId(room.id)}
                      >
                        {room.number}
                      </button>
                    ))}
                  </p>
                ) : (
                  <p className="mt-2">Nenhum quarto equivalente livre neste período.</p>
                )}
              </div>
            ) : null}

            {quote ? (
              <p className="text-sm">
                {quote.nights} noites · {formatCurrency(quote.total)}
              </p>
            ) : null}
            <Button type="submit" disabled={create.isPending || conflicts.length > 0}>
              Confirmar reserva
            </Button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
