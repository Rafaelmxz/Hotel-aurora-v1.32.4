/**
 * Mapa: faixas de reserva, bloqueio e venda fechada.
 * Clique na faixa abre a reserva. Clique no vazio cria reserva nesse quarto/data.
 * Proibido: OTA, tarifário, Experiências. Conflito: overbooking.ts.
 */
import { useEffect, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getReservationsOverlapping,
  parseISODate,
  stayNights,
  TODAY,
  type Reservation,
} from "@/mocks/hotelData";
import { HOUSEKEEPING_DOT, HOUSEKEEPING_LABEL } from "@/features/rooms/housekeeping";
import type { RoomState } from "@/features/rooms/roomStore";
import { cn } from "@/lib/utils";
import { useDragScroll } from "@/lib/useDragScroll";
import { STATUS_BAR, STATUS_LABEL } from "./status";
import { findOverbookedIds } from "./overbooking";
import type { RoomBlock } from "./blockStore";
import type { SaleClose } from "./saleCloseStore";
import { saleCloseOnNight } from "./overbooking";

const VISIBLE_DAYS = 21;

type Span = { id: string; checkIn: string; checkOut: string };

function clampIndex(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function barPlacement(span: Span, start: Date, days: number) {
  const startOffset = differenceInCalendarDays(parseISODate(span.checkIn), start);
  const nights = stayNights(span.checkIn, span.checkOut);
  const colStart = clampIndex(startOffset, 0, days);
  const colEnd = clampIndex(startOffset + nights, 0, days);
  return { colStart, colEnd, hidden: colEnd <= colStart };
}

function visibleOnMap(row: Reservation) {
  return row.status !== "cancelada" && Boolean(row.guestName?.trim());
}

function assignLanes(items: Span[]) {
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
  return `calc(var(--timeline-row-pad) * 2 + ${Math.max(1, laneCount)} * var(--timeline-lane))`;
}

function canDragStay(row: Reservation) {
  return row.status === "pendente" || row.status === "confirmada" || row.status === "check-in";
}

function hitMapCell(clientX: number, clientY: number) {
  const cells = document.querySelectorAll<HTMLElement>("[data-map-cell]");
  for (const cell of cells) {
    const box = cell.getBoundingClientRect();
    if (clientX >= box.left && clientX < box.right && clientY >= box.top && clientY < box.bottom) {
      return { roomId: cell.dataset.roomId ?? "", date: cell.dataset.date ?? "" };
    }
  }
  return null;
}

export function Timeline({
  start,
  reservations,
  blocks,
  saleCloses = [],
  rooms,
  onSelect,
  onSelectBlock,
  onSelectClose,
  onEmptyCell,
  onMoveStay,
  selectedId = null,
  selectedBlockId = null,
}: {
  start: Date;
  reservations: Reservation[];
  blocks: RoomBlock[];
  saleCloses?: SaleClose[];
  rooms: RoomState[];
  onSelect: (reservation: Reservation) => void;
  onSelectBlock: (block: RoomBlock) => void;
  onSelectClose?: (close: SaleClose) => void;
  onEmptyCell: (roomId: string, date: string) => void;
  onMoveStay?: (reservation: Reservation, roomId: string, checkIn: string) => void;
  selectedId?: string | null;
  selectedBlockId?: string | null;
}) {
  const days = Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(start, i));
  const rangeEnd = addDays(start, VISIBLE_DAYS);
  const items = getReservationsOverlapping(start, rangeEnd, reservations).filter(visibleOnMap);
  const visibleBlocks = blocks.filter(
    (row) => row.checkIn < format(rangeEnd, "yyyy-MM-dd") && row.checkOut > format(start, "yyyy-MM-dd"),
  );
  const overbooked = findOverbookedIds(reservations);
  const { ref } = useDragScroll({ lockInteractive: true });
  const skipClick = useRef(false);
  const [ghost, setGhost] = useState<{ name: string; x: number; y: number } | null>(null);
  const layouts = rooms.map((room) => {
    const roomItems = items.filter((item) => item.roomId === room.id);
    const roomBlocks = visibleBlocks.filter((item) => item.roomId === room.id);
    const lanes = assignLanes([...roomItems, ...roomBlocks]);
    return { room, roomItems, roomBlocks, ...lanes };
  });

  useEffect(() => {
    if (!selectedId && !selectedBlockId) return;
    const root = ref.current;
    if (!root) return;
    const target = selectedBlockId ?? selectedId;
    if (!target) return;
    const escaped =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(target)
        : target.replace(/"/g, "");
    const node = root.querySelector(`[data-stay-id="${escaped}"]`);
    node?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selectedId, selectedBlockId, start]);

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
              className="sticky left-0 z-20 flex h-full min-h-0 flex-col justify-center gap-0.5 overflow-hidden border-t border-border bg-card px-2.5"
              style={{ gridColumn: 1, gridRow: roomIndex + 2 }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn("size-2 shrink-0 rounded-full", HOUSEKEEPING_DOT[layout.room.housekeepingStatus])}
                  title={HOUSEKEEPING_LABEL[layout.room.housekeepingStatus]}
                />
                <span className="text-sm font-medium tabular-nums">{layout.room.number}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  {layout.room.type}
                </span>
              </div>
            </div>
          ))}

          {layouts.map((layout, roomIndex) =>
            days.map((day, dayIndex) => (
              <div
                key={`${layout.room.id}-${toKey(day)}`}
                className={cn(
                  "min-h-0 border-t border-l border-border",
                  isWeekend(day) && "bg-weekend/70",
                  isSameDay(day, TODAY) && "bg-today/80",
                  Boolean(saleCloseOnNight(saleCloses, layout.room.type, toKey(day))) &&
                    "timeline-closed-cell",
                )}
                data-map-cell=""
                data-room-id={layout.room.id}
                data-date={toKey(day)}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: roomIndex + 2,
                }}
                onClick={() => {
                  if (ref.current?.dataset.dragged === "1") return;
                  const iso = toKey(day);
                  const closed = saleCloseOnNight(saleCloses, layout.room.type, iso);
                  if (closed) {
                    onSelectClose?.(closed);
                    return;
                  }
                  onEmptyCell(layout.room.id, iso);
                }}
              />
            )),
          )}

          {layouts.map((layout, roomIndex) => (
            <div
              key={`${layout.room.id}-bars`}
              className="relative z-10 overflow-hidden pointer-events-none"
              style={{
                gridColumn: `2 / ${VISIBLE_DAYS + 2}`,
                gridRow: roomIndex + 2,
              }}
            >
              {layout.roomBlocks.map((block) => {
                const { colStart, colEnd, hidden } = barPlacement(block, start, VISIBLE_DAYS);
                if (hidden) return null;
                const span = colEnd - colStart;
                const lane = layout.laneOf.get(block.id) ?? 0;
                const selected = selectedBlockId === block.id;
                return (
                  <button
                    key={block.id}
                    type="button"
                    data-stay-id={block.id}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "timeline-block-bar pointer-events-auto absolute flex items-center overflow-hidden rounded-md px-2 text-left text-xs font-medium shadow-sm",
                      selected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                    )}
                    style={{
                      left: `calc(${colStart} * var(--timeline-day) + 2px)`,
                      width: `calc(${span} * var(--timeline-day) - 4px)`,
                      top: `calc(var(--timeline-row-pad) + ${lane} * var(--timeline-lane))`,
                      height: "calc(var(--timeline-lane) - 6px)",
                      zIndex: selected ? 4 : 3,
                    }}
                    title={`Bloqueado · ${block.reason}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectBlock(block);
                    }}
                  >
                    <span className="block truncate">Bloqueado · {block.reason}</span>
                  </button>
                );
              })}
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
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (!onMoveStay || !canDragStay(reservation)) return;
                      try {
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } catch {
                        /* ignore */
                      }
                      const originX = event.clientX;
                      const originY = event.clientY;
                      const name = reservation.guestName;
                      const pointerId = event.pointerId;
                      let moved = false;
                      function onMove(move: PointerEvent) {
                        if (move.pointerId !== pointerId) return;
                        if (!moved && Math.abs(move.clientX - originX) + Math.abs(move.clientY - originY) < 8) {
                          return;
                        }
                        moved = true;
                        skipClick.current = true;
                        setGhost({ name, x: move.clientX, y: move.clientY });
                      }
                      function onUp(up: PointerEvent) {
                        if (up.pointerId !== pointerId) return;
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                        window.removeEventListener("pointercancel", onUp);
                        setGhost(null);
                        if (!moved || !onMoveStay) return;
                        const hit = hitMapCell(up.clientX, up.clientY);
                        if (!hit?.roomId || !hit.date) return;
                        if (hit.roomId === reservation.roomId && hit.date === reservation.checkIn) return;
                        onMoveStay(reservation, hit.roomId, hit.date);
                      }
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                      window.addEventListener("pointercancel", onUp);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (skipClick.current) {
                        skipClick.current = false;
                        return;
                      }
                      onSelect(reservation);
                    }}
                    className={cn(
                      "pointer-events-auto absolute flex items-center overflow-hidden rounded-md px-2 text-left text-xs font-medium shadow-sm",
                      canDragStay(reservation) && "cursor-grab",
                      STATUS_BAR[reservation.status],
                      conflict && "ring-1 ring-destructive",
                      selected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                    )}
                    style={{
                      left: `calc(${colStart} * var(--timeline-day) + 2px)`,
                      width: `calc(${span} * var(--timeline-day) - 4px)`,
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
      {ghost ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-[var(--shadow-border)]"
          style={{ left: ghost.x + 8, top: ghost.y + 8 }}
        >
          {ghost.name}
        </div>
      ) : null}
    </div>
  );
}

function toKey(day: Date) {
  return format(day, "yyyy-MM-dd");
}

export { VISIBLE_DAYS };
