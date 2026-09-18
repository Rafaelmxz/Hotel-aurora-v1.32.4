import { Link } from "@tanstack/react-router";
import type { Reservation } from "@/mocks/hotelData";
import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE, STATUS_LABEL } from "@/features/reservations/status";
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
    return room ? `${room.number} · ${room.type}` : roomId;
  };

  return (
    <div className="rounded-xl bg-status-pending/10 py-3 text-sm text-status-pending">
      <p className="px-4 font-medium">
        {pending.length} pedido(s) do site aguardando a recepção.
        {!map ? (
          <>
            {" "}
            <Link to="/calendario" className="underline">
              Abrir mapa da recepção
            </Link>
          </>
        ) : null}
      </p>
      {map && onSelect ? (
        <div className="mt-2 max-h-56 overflow-auto px-2">
          <table className="w-full text-left text-foreground">
            <thead className="sticky top-0 bg-status-pending/20 text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-medium">Hóspede</th>
                <th className="px-2 py-1.5 font-medium">Quarto</th>
                <th className="px-2 py-1.5 font-medium">Datas</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-border/50 hover:bg-card/80"
                  onClick={() => onSelect(row)}
                >
                  <td className="px-2 py-1.5 font-medium">{row.guestName}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{roomLabel(row.roomId)}</td>
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                    {row.checkIn} → {row.checkOut}
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge variant={STATUS_BADGE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
