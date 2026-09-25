import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  parseISODate,
  stayNights,
  TODAY,
  toISODate,
  type HousekeepingStatus,
  type Reservation,
  type ReservationStatus,
} from "@/mocks/hotelData";
import { HOUSEKEEPING_DOT, HOUSEKEEPING_LABEL, HOUSEKEEPING_ORDER } from "@/features/rooms/housekeeping";
import { useRooms } from "@/features/rooms/useRooms";
import { CheckInModal } from "./CheckInModal";
import { CreateReservationModal, type CreateStayDraft } from "./CreateReservationModal";
import { BlockRoomModal, type BlockDraft } from "./BlockRoomModal";
import { CloseSaleModal } from "./CloseSaleModal";
import { useSaleCloses } from "./useSaleCloses";
import type { SaleClose } from "./saleCloseStore";
import { PendingBookingsAlert } from "@/features/direct-booking/PendingBookingsAlert";
import { Timeline, VISIBLE_DAYS } from "./Timeline";
import { STATUS_LABEL } from "./status";
import { usePatchReservation, useReservations } from "./useReservations";
import { useBlocks } from "./useBlocks";
import type { RoomBlock } from "./blockStore";

const calendarioRoute = getRouteApi("/calendario");

const LEGEND: ReservationStatus[] = [
  "pendente",
  "confirmada",
  "check-in",
  "check-out",
  "cancelada",
];

const LEGEND_DOT: Record<ReservationStatus, string> = {
  pendente: "bg-status-pending",
  confirmada: "bg-status-confirmed",
  "check-in": "bg-status-checkin",
  "check-out": "bg-status-checkout",
  cancelada: "bg-status-cancelled",
};

export function CalendarPage() {
  const { reserva: reservaSearch } = calendarioRoute.useSearch();
  const [start, setStart] = useState(() => addDays(TODAY, -3));
  const [selectedId, setSelectedId] = useState<string | null>(reservaSearch ?? null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateStayDraft | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [selectedCloseId, setSelectedCloseId] = useState<string | null>(null);
  const { data: reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();
  const { data: blocks = [] } = useBlocks();
  const { data: saleCloses = [] } = useSaleCloses();
  const patchStay = usePatchReservation();

  useEffect(() => {
    if (!reservaSearch) return;
    setSelectedId(reservaSearch);
    setSelectedBlockId(null);
    const reservation = reservations.find((row) => row.id === reservaSearch);
    if (reservation) {
      setStart(addDays(parseISODate(reservation.checkIn), -1));
    }
  }, [reservaSearch, reservations]);

  const selected = useMemo(
    () => reservations.find((row) => row.id === selectedId) ?? null,
    [reservations, selectedId],
  );
  const selectedBlock = useMemo(
    () => blocks.find((row) => row.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );
  const selectedClose = useMemo(
    () => saleCloses.find((row) => row.id === selectedCloseId) ?? null,
    [saleCloses, selectedCloseId],
  );

  function focusStay(row: Reservation) {
    setSelectedBlockId(null);
    setSelectedCloseId(null);
    setSelectedId(row.id);
    setStart(addDays(parseISODate(row.checkIn), -1));
  }

  function focusBlock(row: RoomBlock) {
    setSelectedId(null);
    setSelectedCloseId(null);
    setSelectedBlockId(row.id);
    setBlockDraft(null);
    setBlockOpen(true);
  }

  function openNewStay(draft?: CreateStayDraft) {
    setSelectedId(null);
    setSelectedBlockId(null);
    setSelectedCloseId(null);
    setCreateDraft(draft ?? null);
    setCreateOpen(true);
  }

  function openNewBlock(draft?: BlockDraft) {
    setSelectedId(null);
    setSelectedBlockId(null);
    setSelectedCloseId(null);
    setBlockDraft(draft ?? null);
    setBlockOpen(true);
  }

  function focusClose(row: SaleClose) {
    setSelectedId(null);
    setSelectedBlockId(null);
    setSelectedCloseId(row.id);
    setCloseOpen(true);
  }

  async function moveStay(row: Reservation, roomId: string, checkIn: string) {
    const checkOut = toISODate(addDays(parseISODate(checkIn), stayNights(row.checkIn, row.checkOut)));
    try {
      await patchStay.mutateAsync({ id: row.id, roomId, checkIn, checkOut });
      toast.success(`${row.guestName} movido`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível mover a reserva.");
    }
  }

  const rangeLabel = useMemo(() => {
    const end = addDays(start, VISIBLE_DAYS - 1);
    const startText = format(start, "d MMM", { locale: ptBR });
    const endText = format(end, "d MMM yyyy", { locale: ptBR });
    return `${startText} – ${endText}`;
  }, [start]);

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Mapa de reservas</h1>
          <p className="text-sm text-muted-foreground capitalize">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => openNewStay()}>Nova reserva</Button>
          <Button variant="outline" onClick={() => openNewBlock()}>
            Bloquear quarto
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCloseId(null);
              setCloseOpen(true);
            }}
          >
            Fechar venda
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Semana anterior"
            onClick={() => setStart((current) => addDays(current, -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setStart(addDays(TODAY, -3))}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próxima semana"
            onClick={() => setStart((current) => addDays(current, 7))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <PendingBookingsAlert map onSelect={focusStay} />

      <div className="flex flex-col gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {LEGEND.map((status) => (
            <li key={status} className="inline-flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${LEGEND_DOT[status]}`} />
              {STATUS_LABEL[status]}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className="timeline-block-swatch size-2.5 rounded-full" />
            Bloqueado
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="timeline-closed-swatch size-2.5 rounded-full border border-border" />
            Venda fechada
          </li>
        </ul>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {HOUSEKEEPING_ORDER.map((status: HousekeepingStatus) => (
            <li key={status} className="inline-flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${HOUSEKEEPING_DOT[status]}`} />
              {HOUSEKEEPING_LABEL[status]}
            </li>
          ))}
        </ul>
      </div>

      <Timeline
        start={start}
        reservations={reservations}
        blocks={blocks}
        saleCloses={saleCloses}
        rooms={rooms}
        selectedId={selectedId}
        selectedBlockId={selectedBlockId}
        onSelect={focusStay}
        onSelectBlock={focusBlock}
        onSelectClose={focusClose}
        onMoveStay={moveStay}
        onEmptyCell={(roomId, date) =>
          openNewStay({
            roomId,
            checkIn: date,
            checkOut: toISODate(addDays(parseISODate(date), 1)),
          })
        }
      />
      <p className="text-xs text-muted-foreground">
        Clique abre o pop-up. Arraste a faixa para outra data ou quarto. Célula
        vazia cria reserva. Hachura = venda fechada.
      </p>
      <CreateReservationModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateDraft(null);
        }}
        draft={createDraft}
      />
      <BlockRoomModal
        open={blockOpen}
        onOpenChange={(open) => {
          setBlockOpen(open);
          if (!open) {
            setSelectedBlockId(null);
            setBlockDraft(null);
          }
        }}
        draft={blockDraft}
        existing={selectedBlock}
      />
      <CloseSaleModal
        open={closeOpen}
        onOpenChange={(open) => {
          setCloseOpen(open);
          if (!open) setSelectedCloseId(null);
        }}
        existing={selectedClose}
      />
      <CheckInModal
        reservation={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}
