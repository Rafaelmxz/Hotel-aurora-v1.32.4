import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  parseISODate,
  TODAY,
  type HousekeepingStatus,
  type Reservation,
  type ReservationStatus,
} from "@/mocks/hotelData";
import { HOUSEKEEPING_DOT, HOUSEKEEPING_LABEL, HOUSEKEEPING_ORDER } from "@/features/rooms/housekeeping";
import { useRooms } from "@/features/rooms/useRooms";
import { CheckInModal } from "./CheckInModal";
import { CreateReservationModal } from "./CreateReservationModal";
import { PendingBookingsAlert } from "@/features/direct-booking/PendingBookingsAlert";
import { Timeline, VISIBLE_DAYS } from "./Timeline";
import { STATUS_LABEL } from "./status";
import { useReservations } from "./useReservations";

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
  const navigate = useNavigate({ from: "/calendario" });
  const { reserva: reservaSearch } = calendarioRoute.useSearch();
  const [start, setStart] = useState(() => addDays(TODAY, -3));
  const [selectedId, setSelectedId] = useState<string | null>(reservaSearch ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();

  useEffect(() => {
    if (!reservaSearch) return;
    setSelectedId(reservaSearch);
    const reservation = reservations.find((row) => row.id === reservaSearch);
    if (reservation) {
      setStart(addDays(parseISODate(reservation.checkIn), -1));
    }
  }, [reservaSearch, reservations]);

  const selected = useMemo(
    () => reservations.find((row) => row.id === selectedId) ?? null,
    [reservations, selectedId],
  );

  function focusStay(row: Reservation) {
    setSelectedId(row.id);
    setStart(addDays(parseISODate(row.checkIn), -1));
    void navigate({ search: { reserva: row.id }, replace: true });
  }

  const rangeLabel = useMemo(() => {
    const end = addDays(start, VISIBLE_DAYS - 1);
    const startText = format(start, "d MMM", { locale: ptBR });
    const endText = format(end, "d MMM yyyy", { locale: ptBR });
    return `${startText} – ${endText}`;
  }, [start]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Operação
          </p>
          <h1 className="font-display mt-1 text-3xl font-medium tracking-tight sm:text-4xl">
            Mapa de reservas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground capitalize">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>Nova reserva</Button>
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
        rooms={rooms}
        selectedId={selectedId}
        onSelect={focusStay}
      />
      <p className="text-xs text-muted-foreground">
        Clique numa barra para o movimento da recepção. Noites com duas reservas
        no mesmo quarto aparecem uma abaixo da outra. Canceladas não entram no
        mapa.
      </p>
      <CreateReservationModal open={createOpen} onOpenChange={setCreateOpen} />
      <CheckInModal
        reservation={selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            void navigate({ search: { reserva: undefined }, replace: true });
          }
        }}
      />
    </div>
  );
}
