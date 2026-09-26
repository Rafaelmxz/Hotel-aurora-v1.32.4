/**
 * Conflito de vaga: reserva ativa, bloqueio OU venda fechada no tipo/noites.
 * Tela não decide overbooking; esta função recusa.
 * Proibido: inventar reserva HOUSE / hóspede falso.
 * Bloqueio e fechamento fecham mapa e site; não entram em folio nem pré-reserva.
 */
import {
  parseISODate,
  roomById,
  rooms,
  type Reservation,
  type ReservationStatus,
  type Room,
} from "@/mocks/hotelData";
import { addDays, format } from "date-fns";
import { closeCoversType, type SaleClose } from "./saleCloseStore";

const ACTIVE: ReservationStatus[] = ["pendente", "confirmada", "check-in"];

export type OccupyingSpan = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
};

export class OverbookingError extends Error {
  constructor(
    message: string,
    readonly conflicts: Reservation[],
    readonly alternatives: Room[],
  ) {
    super(message);
    this.name = "OverbookingError";
  }
}

export function isActiveStay(reservation: Reservation) {
  return ACTIVE.includes(reservation.status);
}

/** Check-in_Novo < Check-out_Existente AND Check-out_Novo > Check-in_Existente */
export function intervalsOverlap(
  newIn: string,
  newOut: string,
  existingIn: string,
  existingOut: string,
) {
  return newIn < existingOut && newOut > existingIn;
}

export function findConflicts(
  reservations: Reservation[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeId?: string,
): Reservation[] {
  return reservations.filter(
    (row) =>
      row.roomId === roomId &&
      row.id !== excludeId &&
      isActiveStay(row) &&
      intervalsOverlap(checkIn, checkOut, row.checkIn, row.checkOut),
  );
}

export function findBlockConflicts(
  blocks: OccupyingSpan[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeId?: string,
): OccupyingSpan[] {
  return blocks.filter(
    (row) =>
      row.roomId === roomId &&
      row.id !== excludeId &&
      intervalsOverlap(checkIn, checkOut, row.checkIn, row.checkOut),
  );
}

export function findSaleCloseHits(
  closes: SaleClose[],
  roomType: Room["type"],
  checkIn: string,
  checkOut: string,
): SaleClose[] {
  return closes.filter(
    (row) =>
      closeCoversType(row, roomType) &&
      intervalsOverlap(checkIn, checkOut, row.checkIn, row.checkOut),
  );
}

export type RoomHoldReason = "livre" | "reserva" | "bloqueado" | "fechado";

export function roomHoldReason(
  room: Room,
  reservations: Reservation[],
  checkIn: string,
  checkOut: string,
  blocks: OccupyingSpan[] = [],
  saleCloses: SaleClose[] = [],
): RoomHoldReason {
  if (findConflicts(reservations, room.id, checkIn, checkOut).length > 0) return "reserva";
  if (findBlockConflicts(blocks, room.id, checkIn, checkOut).length > 0) return "bloqueado";
  if (findSaleCloseHits(saleCloses, room.type, checkIn, checkOut).length > 0) return "fechado";
  return "livre";
}

export const HOLD_REASON_LABEL: Record<RoomHoldReason, string> = {
  livre: "livre",
  reserva: "reserva",
  bloqueado: "bloqueado",
  fechado: "venda fechada",
};

export function saleCloseOnNight(closes: SaleClose[], roomType: Room["type"], night: string) {
  return closes.find(
    (row) => closeCoversType(row, roomType) && night >= row.checkIn && night < row.checkOut,
  );
}

export function availableRoomsByType(
  reservations: Reservation[],
  checkIn: string,
  checkOut: string,
  roomList: Room[] = rooms,
  blocks: OccupyingSpan[] = [],
  saleCloses: SaleClose[] = [],
) {
  const grouped: Record<string, Room[]> = {};
  for (const room of roomList) {
    if (findConflicts(reservations, room.id, checkIn, checkOut).length > 0) continue;
    if (findBlockConflicts(blocks, room.id, checkIn, checkOut).length > 0) continue;
    if (findSaleCloseHits(saleCloses, room.type, checkIn, checkOut).length > 0) continue;
    const list = grouped[room.type] ?? [];
    list.push(room);
    grouped[room.type] = list;
  }
  return grouped;
}

export function findAlternativeRooms(
  reservations: Reservation[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  roomList: Room[] = rooms,
  blocks: OccupyingSpan[] = [],
  saleCloses: SaleClose[] = [],
): Room[] {
  const current = roomList.find((room) => room.id === roomId) ?? roomById(roomId);
  if (!current) return [];
  return roomList.filter((room) => {
    if (room.id === roomId) return false;
    if (room.type !== current.type) return false;
    if (findConflicts(reservations, room.id, checkIn, checkOut).length > 0) return false;
    if (findBlockConflicts(blocks, room.id, checkIn, checkOut).length > 0) return false;
    return findSaleCloseHits(saleCloses, room.type, checkIn, checkOut).length === 0;
  });
}

export function blockedNightsForRoom(
  reservations: Reservation[],
  roomId: string,
  blocks: OccupyingSpan[] = [],
  roomType?: Room["type"],
  saleCloses: SaleClose[] = [],
): Set<string> {
  const blocked = new Set<string>();
  function paint(start: string, end: string) {
    let cursor = parseISODate(start);
    const last = parseISODate(end);
    while (cursor < last) {
      blocked.add(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
    }
  }
  for (const row of reservations) {
    if (row.roomId !== roomId || !isActiveStay(row)) continue;
    paint(row.checkIn, row.checkOut);
  }
  for (const row of blocks) {
    if (row.roomId !== roomId) continue;
    paint(row.checkIn, row.checkOut);
  }
  if (roomType) {
    for (const row of saleCloses) {
      if (!closeCoversType(row, roomType)) continue;
      paint(row.checkIn, row.checkOut);
    }
  }
  return blocked;
}

export function findOverbookedIds(reservations: Reservation[]): Set<string> {
  const ids = new Set<string>();
  const active = reservations.filter(isActiveStay);
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]!;
      const b = active[j]!;
      if (a.roomId !== b.roomId) continue;
      if (!intervalsOverlap(a.checkIn, a.checkOut, b.checkIn, b.checkOut)) continue;
      ids.add(a.id);
      ids.add(b.id);
    }
  }
  return ids;
}

export function assertNoOverbooking(
  reservations: Reservation[],
  input: { roomId: string; checkIn: string; checkOut: string; id?: string },
  blocks: OccupyingSpan[] = [],
  saleCloses: SaleClose[] = [],
  roomList: Room[] = rooms,
) {
  const conflicts = findConflicts(
    reservations,
    input.roomId,
    input.checkIn,
    input.checkOut,
    input.id,
  );
  const blockHits = findBlockConflicts(
    blocks,
    input.roomId,
    input.checkIn,
    input.checkOut,
    input.id,
  );
  const room = roomList.find((row) => row.id === input.roomId) ?? roomById(input.roomId);
  const closeHits = room
    ? findSaleCloseHits(saleCloses, room.type, input.checkIn, input.checkOut)
    : [];
  if (conflicts.length === 0 && blockHits.length === 0 && closeHits.length === 0) return;
  const alternatives = findAlternativeRooms(
    reservations,
    input.roomId,
    input.checkIn,
    input.checkOut,
    roomList,
    blocks,
    saleCloses,
  );
  throw new OverbookingError(
    closeHits.length
      ? "Venda fechada neste tipo e período. A inserção foi recusada."
      : blockHits.length
        ? "Este quarto está bloqueado neste período. A inserção foi recusada."
        : "OVERBOOKING: já existe reserva ativa neste quarto e período. A inserção foi recusada.",
    conflicts,
    alternatives,
  );
}
