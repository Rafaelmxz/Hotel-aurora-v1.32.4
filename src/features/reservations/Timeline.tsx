import { useEffect } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getReservationsOverlapping,
  parseISODate,
  stayNights,
  TODAY,
  type Reservation,
} from "@/mocks/hotelData";
import { HousekeepingMark } from "@/features/rooms/HousekeepingMark";
import type { RoomState } from "@/features/rooms/roomStore";
import { cn } from "@/lib/utils";
import { useDragScroll } from "@/lib/useDragScroll";
import { STATUS_BAR, STATUS_LABEL } from "./status";
import { findOverbookedIds } from "./overbooking";

const VISIBLE_DAYS = 21;

function clampIndex(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function barPlacement(reservation: Reservation, start: Date, days: number) {
  const startOffset = differenceInCalendarDays(parseISODate(reservation.checkIn), start);
  const nights = stayNights(reservation.checkIn, reservation.checkOut);
  const colStart = clampIndex(startOffset, 0, days);
  const colEnd = clampIndex(startOffset + nights, 0, days);
  return { colStart, colEnd, hidden: colEnd <= colStart };
}

function visibleOnMap(row: Reservation) {
  return row.status !== "cancelada" && Boolean(row.guestName?.trim());
}

function assignLanes(items: Reservation[]) {
  const sorted = [...items].sort(
    (a, b) =>
      a.checkIn.localeCompare(b.checkIn) ||
      a.checkOut.localeCompare(b.checkOut) ||
      a.id.localeCompare(b.id),
  );
  const until: string[] = [];
  const laneOf = new Map<string, number>();
  for (const row of sorted) {
    let lane = until.findIndex((end) => end <= row.checkIn);
    if (lane < 0) {
      lane = until.length;
      until.push(row.checkOut);
    } else {
      until[lane] = row.checkOut;
    }
    laneOf.set(row.id, lane);
  }
  return { laneOf, laneCount: Math.max(1, until.length) };
}

function rowTrack(laneCount: number) {
  return `calc(var(--timeline-row-pad) * 2 + ${laneCount} * var(--timeline-lane))`;
}

export function Timeline({
  start,
  reservations,
  rooms,
  onSelect,
  selectedId = null,
}: {
  start: Date;
  reservations: Reservation[];
  rooms: RoomState[];
  onSelect: (reservation: Reservation) => void;
  selectedId?: string | null;
}) {
  const days = Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(start, i));
  const rangeEnd = addDays(start, VISIBLE_DAYS);
  const items = getReservationsOverlapping(start, rangeEnd, reservations).filter(visibleOnMap);
  const overbooked = findOverbookedIds(reservations);
  const { ref } = useDragScroll({ lockInteractive: false });
  const layouts = rooms.map((room) => {
    const roomItems = items.filter((item) => item.roomId === room.id);
    const lanes = assignLanes(roomItems);
    return { room, roomItems, ...lanes };
  });

  useEffect(() => {
    if (!selectedId) return;
    const root = ref.current;
    if (!root) return;
    const escaped =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(selectedId)
        : selectedId.replace(/"/g, "");
    const node = root.querySelector(`[data-stay-id="${escaped}"]`);
    node?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selectedId, start]);

  return (
    <div className="timeline-map min-w-0 overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
      <div
        ref={ref}
        className="timeline-scroll max-h-(--timeline-max-h) cursor-grab overflow-auto overscroll-x-contain"
      >
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `var(--timeline-sidebar) repeat(${VISIBLE_DAYS}, var(--timeline-day))`,
            gridTemplateRows: `var(--timeline-head) ${layouts.map((row) => rowTrack(row.laneCount)).join(" ")}`,
            width: `calc(var(--timeline-sidebar) + ${VISIBLE_DAYS} * var(--timeline-day))`,
          }}
        >
          <div className="sticky top-0 left-0 z-30 flex h-(--timeline-head) items-end bg-card px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Quarto
          </div>
          {days.map((day, index) => {
            const today = isSameDay(day, TODAY);
            const weekend = isWeekend(day);
            return (
              <div
                key={toKey(day)}
                className={cn(
                  "sticky top-0 z-20 flex h-(--timeline-head) flex-col items-center justify-center border-l border-border bg-card",
                  weekend && "bg-weekend",
                  today && "bg-today",
                )}
                style={{ gridColumn: index + 2, gridRow: 1 }}
              >
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}

          {layouts.map((layout, roomIndex) => (
            <div
              key={layout.room.id}
              className="sticky left-0 z-20 flex flex-col justify-center gap-0.5 overflow-visible border-t border-border bg-card px-2.5"
              style={{ gridColumn: 1, gridRow: roomIndex + 2 }}
            >
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="text-sm font-medium tabular-nums">{layout.room.number}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  {layout.room.type}
                </span>
              </div>
              <HousekeepingMark room={layout.room} compact />
            </div>
          ))}

          {layouts.map((layout, roomIndex) =>
            days.map((day, dayIndex) => (
              <div
                key={`${layout.room.id}-${toKey(day)}`}
                className={cn(
                  "border-t border-l border-border",
                  isWeekend(day) && "bg-weekend/70",
                  isSameDay(day, TODAY) && "bg-today/80",
                )}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: roomIndex + 2,
                }}
              />
            )),
          )}

          {layouts.map((layout, roomIndex) => (
            <div
              key={`${layout.room.id}-bars`}
              className="relative z-10 overflow-hidden"
              style={{
                gridColumn: `2 / ${VISIBLE_DAYS + 2}`,
                gridRow: roomIndex + 2,
              }}
            >
              {layout.roomItems.map((reservation) => {
                const { colStart, colEnd, hidden } = barPlacement(
                  reservation,
                  start,
                  VISIBLE_DAYS,
                );
                if (hidden) return null;
                const conflict = overbooked.has(reservation.id);
                const span = colEnd - colStart;
                const lane = layout.laneOf.get(reservation.id) ?? 0;
                const selected = selectedId === reservation.id;
                return (
                  <button
                    key={reservation.id}
                    type="button"
                    data-stay-id={reservation.id}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      if (ref.current?.dataset.dragged === "1") return;
                      onSelect(reservation);
                    }}
                    className={cn(
                      "absolute flex items-center overflow-hidden rounded-md px-2 text-left text-xs font-medium shadow-sm",
                      STATUS_BAR[reservation.status],
                      conflict && "ring-1 ring-destructive",
                      selected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                    )}
                    style={{
                      left: `calc(${colStart} * var(--timeline-day) + 4px)`,
                      width: `calc(${span} * var(--timeline-day) - 8px)`,
                      top: `calc(var(--timeline-row-pad) + ${lane} * var(--timeline-lane))`,
                      height: "calc(var(--timeline-lane) - 6px)",
                      zIndex: selected ? 4 : reservation.status === "check-out" ? 1 : 2,
                    }}
                    title={
                      conflict
                        ? `CONFLITO / OVERBOOKING · ${reservation.guestName}`
                        : `${reservation.guestName} · ${STATUS_LABEL[reservation.status]}`
                    }
                  >
                    <span className="block truncate">
                      {conflict ? "! " : ""}
                      {reservation.guestName}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toKey(day: Date) {
  return format(day, "yyyy-MM-dd");
}

export { VISIBLE_DAYS };
