import {
  isStayActiveOn,
  rooms as seedRooms,
  TODAY,
  type HousekeepingStatus,
  type Room,
} from "@/mocks/hotelData";
import { listReservations } from "@/features/reservations/reservationStore";

export type RoomState = Room & {
  housekeepingStatus: HousekeepingStatus;
  housekeepingNote?: string;
  cleaningStartedAt?: string;
  frontDeskNote?: string;
};

export const roomKeys = {
  all: ["rooms"] as const,
};

function seedHousekeeping(): RoomState[] {
  const occupied = new Set(
    listReservations()
      .filter((reservation) => isStayActiveOn(reservation, TODAY))
      .map((reservation) => reservation.roomId),
  );

  return seedRooms.map((room) => {
    let housekeepingStatus: HousekeepingStatus = occupied.has(room.id)
      ? "sujo"
      : "limpo";
    if (room.number === "402") housekeepingStatus = "manutencao";
    return { ...room, housekeepingStatus };
  });
}

let store: RoomState[] = seedHousekeeping();

export function listRooms(): RoomState[] {
  return store.map((row) => ({ ...row }));
}

export function replaceRooms(rows: RoomState[]) {
  store = rows.map((row) => ({ ...row }));
}

export function patchRoomHousekeeping(
  id: string,
  housekeepingStatus: HousekeepingStatus,
  extras?: { note?: string },
): RoomState {
  const index = store.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Quarto não encontrado");
  const current = store[index]!;
  const next: RoomState = {
    ...current,
    housekeepingStatus,
    housekeepingNote:
      housekeepingStatus === "manutencao"
        ? extras?.note?.trim() || current.housekeepingNote
        : undefined,
    cleaningStartedAt:
      housekeepingStatus === "em_limpeza"
        ? current.cleaningStartedAt ?? new Date().toISOString()
        : undefined,
  };
  store = [...store.slice(0, index), next, ...store.slice(index + 1)];
  return { ...next };
}

export function markRoomDirty(id: string): RoomState | undefined {
  const room = store.find((row) => row.id === id);
  if (!room) return undefined;
  if (room.housekeepingStatus === "manutencao") return { ...room };
  return patchRoomHousekeeping(id, "sujo");
}

export function setRoomNote(id: string, note: string): RoomState {
  const index = store.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Quarto não encontrado");
  const current = store[index]!;
  const frontDeskNote = note.trim().slice(0, 80) || undefined;
  const next: RoomState = { ...current, frontDeskNote };
  store = [...store.slice(0, index), next, ...store.slice(index + 1)];
  return { ...next };
}
