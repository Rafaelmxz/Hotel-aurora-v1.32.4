/**
 * Pedidos do site na recepção. No mapa: faixa compacta com rolagem.
 * Clique abre a reserva no pop-up. Não confirma, não mexe ouro/OTA.
 */
import { Link } from "@tanstack/react-router";
import type { Reservation } from "@/mocks/hotelData";
import { STATUS_LABEL } from "@/features/reservations/status";
import { useReservations } from "@/features/reservations/useReservations";
import { useRooms } from "@/features/rooms/useRooms";

export function PendingBookingsAlert({
  map = false,
  onSelect,
}: {
  map?: boolean;
  compact?: boolean;
  onSelect?: (row: Reservation) => void;
}) {
  const { data: reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();
  const pending = reservations
    .filter(
      (row) =>
        row.status === "pendente" ||
        (row.origin === "Link público" && row.status === "confirmada"),
    )
    .sort(
      (a, b) =>
        a.checkIn.localeCompare(b.checkIn) || a.guestName.localeCompare(b.guestName),
    );

  if (pending.length === 0) return null;

  const roomLabel = (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);
    return room ? `${room.number}` : roomId;
  };

  if (map && onSelect) {
    return (
      <div className="flex max-h-16 items-stretch gap-2 overflow-hidden rounded-lg bg-status-pending/10 px-2 py-1 text-status-pending">
        <p className="flex shrink-0 items-center text-xs font-medium">
          {pending.length} pedidos
        </p>
        <div className="pending-scroll flex min-h-0 min-w-0 flex-1 flex-col flex-wrap content-start gap-1 overflow-x-auto overflow-y-auto">
          {pending.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row)}
              className="h-6 shrink-0 rounded-md bg-card px-2 text-left text-xs text-foreground"
              title={`${row.guestName} · ${roomLabel(row.roomId)} · ${row.checkIn}`}
            >
              {row.guestName}
              <span className="ml-1 text-muted-foreground">
                {roomLabel(row.roomId)} · {STATUS_LABEL[row.status]}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-status-pending/10 px-4 py-3 text-sm text-status-pending">
      <p className="font-medium">
        {pending.length} pedido(s) do site aguardando a recepção.{" "}
        <Link to="/calendario" className="underline">
          Abrir mapa da recepção
        </Link>
      </p>
    </div>
  );
}
