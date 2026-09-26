/**
 * Tela Casa: situação do hotel agora.
 * Pode: casinha, cor, visto, seta entra/sai, recado curto, bolinha de limpeza.
 * Proibido: mudar limpeza, folio, coração/bolo (depois).
 * Lê: roomStore + reservas/bloqueios/fechamentos. Recado: frontDeskNote no cofre.
 */
import { useEffect, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ChevronRight, House, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TODAY_ISO, type Reservation } from "@/mocks/hotelData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HOUSEKEEPING_DOT,
  HOUSEKEEPING_LABEL,
  HOUSEKEEPING_ORDER,
} from "@/features/rooms/housekeeping";
import { useRooms, useSetRoomNote } from "@/features/rooms/useRooms";
import { useReservations } from "@/features/reservations/useReservations";
import { useBlocks } from "@/features/reservations/useBlocks";
import { useSaleCloses } from "@/features/reservations/useSaleCloses";
import { saleCloseOnNight } from "@/features/reservations/overbooking";
import type { RoomBlock } from "@/features/reservations/blockStore";
import type { SaleClose } from "@/features/reservations/saleCloseStore";
import type { RoomState } from "@/features/rooms/roomStore";

type HouseTone = "livre" | "ocupado" | "pendente" | "indisponivel";

const TONE_HOUSE: Record<HouseTone, string> = {
  livre: "text-muted-foreground",
  ocupado: "text-status-checkin",
  pendente: "text-status-pending",
  indisponivel: "text-destructive",
};

const TONE_CARD: Record<HouseTone, string> = {
  livre: "bg-card",
  ocupado: "bg-status-checkin/10",
  pendente: "bg-status-pending/10",
  indisponivel: "bg-destructive/10",
};

const TONE_LABEL: Record<HouseTone, string> = {
  livre: "Livre",
  ocupado: "Ocupado",
  pendente: "Pré-reserva",
  indisponivel: "Indisponível",
};

function stayTonight(roomId: string, reservations: Reservation[], today: string) {
  return reservations.find(
    (row) =>
      row.roomId === roomId &&
      row.status !== "cancelada" &&
      row.status !== "check-out" &&
      row.checkIn <= today &&
      row.checkOut > today,
  );
}

function stayMoves(roomId: string, reservations: Reservation[], today: string) {
  const rows = reservations.filter((row) => row.roomId === roomId && row.status !== "cancelada");
  return {
    arriving: rows.some((row) => row.checkIn === today && row.status !== "check-out"),
    leaving: rows.some((row) => row.checkOut === today),
  };
}

function blockTonight(roomId: string, blocks: RoomBlock[], today: string) {
  return blocks.some((row) => row.roomId === roomId && row.checkIn <= today && row.checkOut > today);
}

function toneOf(
  room: RoomState,
  reservations: Reservation[],
  blocks: RoomBlock[],
  saleCloses: SaleClose[],
  today: string,
): { tone: HouseTone; confirmed: boolean } {
  const stay = stayTonight(room.id, reservations, today);
  if (stay) {
    if (stay.status === "pendente") return { tone: "pendente", confirmed: false };
    return { tone: "ocupado", confirmed: true };
  }
  if (
    room.housekeepingStatus === "manutencao" ||
    blockTonight(room.id, blocks, today) ||
    Boolean(saleCloseOnNight(saleCloses, room.type, today))
  ) {
    return { tone: "indisponivel", confirmed: false };
  }
  return { tone: "livre", confirmed: false };
}

export function HouseMapView() {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const { data: blocks = [] } = useBlocks();
  const { data: saleCloses = [] } = useSaleCloses();
  const setNote = useSetRoomNote();
  const [noteRoomId, setNoteRoomId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const sorted = [...rooms].sort((a, b) => a.number.localeCompare(b.number, "pt", { numeric: true }));
  const noteRoom = rooms.find((row) => row.id === noteRoomId) ?? null;

  useEffect(() => {
    if (!noteRoom) return;
    setNoteDraft(noteRoom.frontDeskNote ?? "");
  }, [noteRoom?.id, noteRoom?.frontDeskNote]);

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!noteRoom) return;
    try {
      await setNote.mutateAsync({ id: noteRoom.id, note: noteDraft });
      toast.success(noteDraft.trim() ? `Recado no ${noteRoom.number}` : `Recado do ${noteRoom.number} apagado`);
      setNoteRoomId(null);
    } catch {
      toast.error("Não foi possível gravar o recado.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight">Casa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Como está cada quarto agora. A camareira controla a limpeza na aba Limpeza.
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(Object.keys(TONE_LABEL) as HouseTone[]).map((tone) => (
          <li key={tone} className="inline-flex items-center gap-1.5">
            <House className={cn("size-3.5", TONE_HOUSE[tone])} strokeWidth={2} aria-hidden />
            {TONE_LABEL[tone]}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <Check className="size-3.5 text-status-checkin" strokeWidth={2.5} aria-hidden />
          Confirmada
        </li>
        <li className="inline-flex items-center gap-1">
          <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden />
          <House className="size-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
          Entra hoje
        </li>
        <li className="inline-flex items-center gap-1">
          <House className="size-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
          <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden />
          Sai hoje
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Mail className="size-3.5" strokeWidth={2} aria-hidden />
          Recado
        </li>
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {HOUSEKEEPING_ORDER.map((status) => (
          <li key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", HOUSEKEEPING_DOT[status])} />
            {HOUSEKEEPING_LABEL[status]}
          </li>
        ))}
      </ul>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((room) => {
          const { tone, confirmed } = toneOf(room, reservations, blocks, saleCloses, TODAY_ISO);
          const { arriving, leaving } = stayMoves(room.id, reservations, TODAY_ISO);
          return (
            <li key={room.id}>
              <article
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-4",
                  TONE_CARD[tone],
                )}
              >
                <span
                  className={cn(
                    "absolute top-2.5 right-2.5 size-2.5 rounded-full",
                    HOUSEKEEPING_DOT[room.housekeepingStatus],
                  )}
                  title={HOUSEKEEPING_LABEL[room.housekeepingStatus]}
                />
                <button
                  type="button"
                  className={cn(
                    "absolute top-1.5 left-1.5 rounded-md p-1",
                    room.frontDeskNote ? "text-foreground" : "text-muted-foreground/50 hover:text-foreground",
                  )}
                  aria-label={room.frontDeskNote ? `Recado: ${room.frontDeskNote}` : "Adicionar recado"}
                  onClick={() => setNoteRoomId(room.id)}
                >
                  <Mail className="size-4" strokeWidth={room.frontDeskNote ? 2.4 : 1.75} />
                </button>
                <span className="flex items-center gap-0.5">
                  <ChevronRight
                    className={cn("size-5 shrink-0", arriving ? "text-foreground" : "invisible")}
                    strokeWidth={2.5}
                    aria-label={arriving ? "Entra hoje" : undefined}
                  />
                  <span className="relative">
                    <House className={cn("size-10", TONE_HOUSE[tone])} strokeWidth={1.5} aria-hidden />
                    {confirmed ? (
                      <Check
                        className="absolute -right-1 -bottom-1 size-4 text-status-checkin"
                        strokeWidth={3}
                        aria-label="Reserva confirmada"
                      />
                    ) : null}
                  </span>
                  <ChevronRight
                    className={cn("size-5 shrink-0", leaving ? "text-foreground" : "invisible")}
                    strokeWidth={2.5}
                    aria-label={leaving ? "Sai hoje" : undefined}
                  />
                </span>
                <p className="font-display text-2xl font-medium leading-none">{room.number}</p>
                <p className="text-xs text-muted-foreground">{room.type}</p>
                <p className="text-xs text-muted-foreground">{TONE_LABEL[tone]}</p>
                {room.frontDeskNote ? (
                  <p className="line-clamp-2 text-center text-[11px] text-foreground">{room.frontDeskNote}</p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>

      <DialogPrimitive.Root
        open={Boolean(noteRoom)}
        onOpenChange={(open) => {
          if (!open) setNoteRoomId(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/40" />
          <DialogPrimitive.Content
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="fixed top-1/2 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-lg"
          >
            <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
              Recado · {noteRoom?.number}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              Texto curto para a recepção. Coração e bolo ficam para depois.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 hover:opacity-100">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
            <form onSubmit={(event) => void saveNote(event)} className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="house-note">Recado</Label>
                <Textarea
                  id="house-note"
                  maxLength={80}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Berço, aniversário, chega tarde…"
                />
                <p className="text-xs text-muted-foreground">{noteDraft.length}/80</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={setNote.isPending}>
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={setNote.isPending || !noteRoom?.frontDeskNote}
                  onClick={() => {
                    if (!noteRoom) return;
                    void setNote.mutateAsync({ id: noteRoom.id, note: "" }).then(() => {
                      toast.success(`Recado do ${noteRoom.number} apagado`);
                      setNoteRoomId(null);
                    });
                  }}
                >
                  Apagar
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
