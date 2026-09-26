/**
 * Ficha do balcão: datas → pessoas → quarto → hóspede → origem → criar.
 * Pode: pré-reserva pendente com prazo, ou reserva confirmada.
 * Proibido: OTA, tarifário por segmento, Experiências, Pix, folio extra.
 * Grava: reservationStore (cofre). Preço: quoteStay. Vaga: overbooking.
 * Lista risca ocupado / bloqueado / venda fechada / tipo que não cabe.
 */
import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { OnMapDialog } from "./OnMapDialog";
import { addDays, addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY, TODAY_ISO, formatCurrency, parseISODate, toISODate } from "@/mocks/hotelData";
import { GuestSearch } from "@/features/guests/GuestSearch";
import type { Guest } from "@/features/guests/guestStore";
import { useRooms } from "@/features/rooms/useRooms";
import { useRoomTypes } from "@/features/rooms/useRoomTypes";
import { typeHoldsParty } from "@/features/rooms/roomTypeStore";
import { useProperty } from "@/features/settings/useProperty";
import { cn } from "@/lib/utils";
import { quoteNewReservation } from "./reservationStore";
import { useCreateReservation, useReservations } from "./useReservations";
import { useBlocks } from "./useBlocks";
import { useSaleCloses } from "./useSaleCloses";
import {
  OverbookingError,
  HOLD_REASON_LABEL,
  roomHoldReason,
  type RoomHoldReason,
} from "./overbooking";

const ORIGINS = ["Balcão", "Telefone", "WhatsApp", "Site"] as const;
const STRIP_DAYS = 7;

function tomorrowIso() {
  return toISODate(addDays(parseISODate(TODAY_ISO), 1));
}

export type CreateStayDraft = {
  roomId: string;
  checkIn: string;
  checkOut: string;
};

export function CreateReservationModal({
  open,
  onOpenChange,
  draft = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft?: CreateStayDraft | null;
}) {
  const { data: rooms = [] } = useRooms();
  const { data: types = [] } = useRoomTypes();
  const { data: reservations = [] } = useReservations();
  const { data: blocks = [] } = useBlocks();
  const { data: saleCloses = [] } = useSaleCloses();
  const { data: property } = useProperty();
  const create = useCreateReservation();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [origin, setOrigin] = useState<(typeof ORIGINS)[number]>("Balcão");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState(TODAY_ISO);
  const [checkOut, setCheckOut] = useState(() => tomorrowIso());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"hold" | "confirm" | null>(null);
  const [stripStart, setStripStart] = useState(TODAY);

  useEffect(() => {
    if (!open) return;
    setGuest(null);
    setName("");
    setPhone("");
    setEmail("");
    setOrigin("Balcão");
    setAdults(2);
    setChildren(0);
    const inDate = draft?.checkIn && draft.checkIn >= TODAY_ISO ? draft.checkIn : TODAY_ISO;
    const outDate =
      draft?.checkOut && draft.checkOut > inDate
        ? draft.checkOut
        : toISODate(addDays(parseISODate(inDate), 1));
    setRoomId(draft?.roomId ?? "");
    setCheckIn(inDate);
    setCheckOut(outDate);
    setNotes("");
    setSaving(null);
    setStripStart(parseISODate(inDate) < TODAY ? TODAY : parseISODate(inDate));
  }, [open, draft]);

  const previewDays = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, index) => addDays(stripStart, index)),
    [stripStart],
  );

  const typeByName = useMemo(() => new Map(types.map((row) => [row.type, row])), [types]);

  const roomRows = useMemo(() => {
    return rooms.map((room) => {
      const profile = typeByName.get(room.type);
      const fits = profile ? typeHoldsParty(profile, adults, children) : true;
      const hold: RoomHoldReason = roomHoldReason(
        room,
        reservations,
        checkIn,
        checkOut,
        blocks,
        saleCloses,
      );
      const free = hold === "livre";
      return { room, fits, hold, free };
    });
  }, [rooms, typeByName, adults, children, reservations, checkIn, checkOut, blocks, saleCloses]);

  const freeRooms = roomRows.filter((row) => row.free);
  const freeIds = freeRooms.map((row) => row.room.id).join(",");
  const selected = roomRows.find((row) => row.room.id === roomId) ?? null;

  useEffect(() => {
    if (!open) return;
    const ids = freeIds ? freeIds.split(",") : [];
    if (roomId && ids.includes(roomId)) return;
    setRoomId(ids[0] ?? "");
  }, [open, freeIds, roomId]);

  const quote = useMemo(() => {
    if (!roomId || !checkIn || !checkOut) return null;
    try {
      return quoteNewReservation(roomId, checkIn, checkOut, { adults, children });
    } catch {
      return null;
    }
  }, [roomId, checkIn, checkOut, adults, children]);

  const holdLabel = useMemo(() => {
    const hours = property?.cancelFreeHours ?? 48;
    const until = addHours(new Date(), hours);
    return {
      hours,
      iso: until.toISOString(),
      text: format(until, "d MMM HH:mm", { locale: ptBR }),
    };
  }, [property?.cancelFreeHours]);

  function applyGuest(next: Guest) {
    setGuest(next);
    setName(next.name);
    setEmail(next.email);
    setPhone(next.phone);
    if (next.tags.includes("Inadimplente") || next.preferences.length) {
      toast.warning(
        `${next.name}: ${[...next.tags, ...next.preferences].slice(0, 3).join(" · ")}`,
      );
    }
  }

  function setIn(iso: string) {
    setCheckIn(iso);
    if (checkOut <= iso) setCheckOut(toISODate(addDays(parseISODate(iso), 1)));
    const picked = parseISODate(iso);
    const end = addDays(stripStart, STRIP_DAYS - 1);
    if (picked < stripStart || picked > end) setStripStart(picked < TODAY ? TODAY : picked);
  }

  async function save(mode: "hold" | "confirm") {
    if (!name.trim()) {
      toast.error("Informe o nome do hóspede.");
      return;
    }
    if (!selected?.free) {
      toast.error("Escolha um quarto livre nestas datas.");
      return;
    }
    setSaving(mode);
    const party = Math.max(1, adults) + Math.max(0, children);
    const holdLine =
      mode === "hold" ? `Confirmar até ${holdLabel.text} (${holdLabel.hours}h)` : "";
    const extra = [notes.trim(), guest?.preferences.join("; "), holdLine].filter(Boolean).join(" · ");
    try {
      await create.mutateAsync({
        roomId: selected.room.id,
        guestName: name.trim(),
        guestEmail: email,
        guestPhone: phone,
        checkIn,
        checkOut,
        guests: party,
        adults,
        children,
        origin,
        notes: extra || undefined,
        status: mode === "hold" ? "pendente" : "confirmada",
        holdUntil: mode === "hold" ? holdLabel.iso : undefined,
      });
      toast.success(
        mode === "hold"
          ? `Pré-reserva de ${name} até ${holdLabel.text}`
          : `Reserva criada · ${name}`,
      );
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof OverbookingError || error instanceof Error
          ? error.message
          : "Não foi possível criar a reserva.";
      toast.error(message);
    } finally {
      setSaving(null);
    }
  }

  const busy = create.isPending || saving !== null;
  const canBook = Boolean(selected?.free && name.trim());

  return (
    <OnMapDialog open={open} onOpenChange={onOpenChange}>
          <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
            Nova reserva
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            Datas e ocupação primeiro. Depois o quarto que cabe, e o hóspede.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 hover:opacity-100">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>

          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  required
                  min={TODAY_ISO}
                  value={checkIn}
                  onChange={(event) => setIn(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  required
                  min={toISODate(addDays(parseISODate(checkIn), 1))}
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Disponibilidade (7 dias)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  aria-label="Dias anteriores"
                  disabled={stripStart <= TODAY}
                  onClick={() =>
                    setStripStart((current) => {
                      const next = addDays(current, -STRIP_DAYS);
                      return next < TODAY ? TODAY : next;
                    })
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex min-w-0 flex-1 gap-1">
                  {previewDays.map((day) => {
                    const iso = format(day, "yyyy-MM-dd");
                    const next = toISODate(addDays(day, 1));
                    const anyFree = rooms.some(
                      (room) =>
                        roomHoldReason(room, reservations, iso, next, blocks, saleCloses) === "livre",
                    );
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={!anyFree}
                        onClick={() => setIn(iso)}
                        className={cn(
                          "flex h-9 min-w-0 flex-1 flex-col items-center justify-center rounded-md text-[11px] leading-none tabular-nums",
                          !anyFree
                            ? "cursor-not-allowed bg-destructive/15 text-destructive line-through"
                            : iso === checkIn
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary",
                        )}
                        title={!anyFree ? "Sem quarto livre" : iso}
                      >
                        <span className="text-[9px] uppercase opacity-70">
                          {format(day, "EEEEE", { locale: ptBR })}
                        </span>
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  aria-label="Próximos dias"
                  onClick={() => setStripStart((current) => addDays(current, STRIP_DAYS))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new-adults">Adultos</Label>
                <Input
                  id="new-adults"
                  inputMode="numeric"
                  value={String(adults)}
                  onChange={(event) => setAdults(Math.max(1, Number(event.target.value) || 1))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-children">Crianças</Label>
                <Input
                  id="new-children"
                  inputMode="numeric"
                  value={String(children)}
                  onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Quarto</Label>
              <ul className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-border p-1">
                {roomRows.map(({ room, fits, hold, free }) => {
                  const reason = !fits
                    ? "capacidade + extra"
                    : HOLD_REASON_LABEL[hold];
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        disabled={!free}
                        onClick={() => setRoomId(room.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                          free
                            ? roomId === room.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-secondary"
                            : "cursor-not-allowed text-muted-foreground",
                        )}
                      >
                        <span className={cn(!free && "line-through")}>
                          {room.number} · {room.type}
                        </span>
                        <span className="text-xs opacity-80">{reason}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {freeRooms.length === 0 ? (
                <p className="text-sm text-destructive">
                  Nenhum quarto livre nestas datas.
                </p>
              ) : null}
              {selected && !selected.fits ? (
                <div className="rounded-lg border-2 border-destructive bg-destructive/15 p-4 text-destructive">
                  <p className="text-lg font-semibold leading-tight">Capacidade excedida</p>
                  <p className="mt-1 text-sm">
                    {selected.room.type} cabe {typeByName.get(selected.room.type)?.maxAdults ?? "?"}{" "}
                    adulto(s) e {typeByName.get(selected.room.type)?.maxChildren ?? 0} criança(s).
                    Pode confirmar: entra taxa extra +ADL / +CHD.
                  </p>
                </div>
              ) : null}
            </div>

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
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                required
                value={name}
                placeholder="Se a busca não achar, cadastre aqui"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new-phone">Telefone</Label>
                <Input
                  id="new-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-email">E-mail (opcional)</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-origin">Origem</Label>
              <select
                id="new-origin"
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={origin}
                onChange={(event) => setOrigin(event.target.value as (typeof ORIGINS)[number])}
              >
                {ORIGINS.map((row) => (
                  <option key={row} value={row}>
                    {row}
                  </option>
                ))}
              </select>
            </div>

            {quote ? (
              <p className="text-sm">
                {quote.nights} noites · {formatCurrency(quote.total)}
                <span className="ml-2 text-muted-foreground">tarifa do hotel</span>
              </p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="new-notes">Observação</Label>
              <Input
                id="new-notes"
                maxLength={160}
                value={notes}
                placeholder="Chega tarde, berço…"
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !canBook}
                onClick={() => void save("hold")}
              >
                Pré-reserva · {holdLabel.hours}h
              </Button>
              <Button type="button" disabled={busy || !canBook} onClick={() => void save("confirm")}>
                Criar reserva
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pré-reserva entra pendente e segura a vaga até {holdLabel.text}. Criar confirma agora.
            </p>
          </div>
    </OnMapDialog>
  );
}
