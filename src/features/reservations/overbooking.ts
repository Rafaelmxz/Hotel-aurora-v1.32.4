import {
  parseISODate,
  roomById,
  rooms,
  type Reservation,
  type ReservationStatus,
  type Room,
} from "@/mocks/hotelData";
import { addDays, format } from "date-fns";

const ACTIVE: ReservationStatus[] = ["pendente", "confirmada", "check-in"];

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

export function availableRoomsByType(
  reservations: Reservation[],
  checkIn: string,
  checkOut: string,
  roomList: Room[] = rooms,
) {
  const grouped: Record<string, Room[]> = {};
  for (const room of roomList) {
    if (findConflicts(reservations, room.id, checkIn, checkOut).length > 0) continue;
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
): Room[] {
  const current = roomList.find((room) => room.id === roomId) ?? roomById(roomId);
  if (!current) return [];
  return roomList.filter((room) => {
    if (room.id === roomId) return false;
    if (room.type !== current.type) return false;
    return findConflicts(reservations, room.id, checkIn, checkOut).length === 0;
  });
}

export function blockedNightsForRoom(
  reservations: Reservation[],
  roomId: string,
): Set<string> {
  const blocked = new Set<string>();
  for (const row of reservations) {
    if (row.roomId !== roomId || !isActiveStay(row)) continue;
    let cursor = parseISODate(row.checkIn);
    const end = parseISODate(row.checkOut);
    while (cursor < end) {
      blocked.add(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
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
) {
  const conflicts = findConflicts(
    reservations,
    input.roomId,
    input.checkIn,
    input.checkOut,
    input.id,
  );
  if (conflicts.length === 0) return;
  const alternatives = findAlternativeRooms(
    reservations,
    input.roomId,
    input.checkIn,
    input.checkOut,
  );
  throw new OverbookingError(
    "OVERBOOKING: já existe reserva ativa neste quarto e período. A inserção foi recusada.",
    conflicts,
    alternatives,
  );
}
