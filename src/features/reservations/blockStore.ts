/**
 * Bloqueio de quarto no mapa.
 * Tela: criar/remover na aba Hotel e faixa no /calendario, com motivo curto.
 * Proibido: hóspede, folio, Pix, check-in, voucher, pré-reserva.
 * Store que grava: este arquivo → cofre (`blocks`).
 * Não ocupa ADR; ocupa a vaga (mapa + site).
 * Não mistura com tarifário, OTA nem Experiências.
 */
import { assertValidPeriod } from "@/lib/hotel/rules";
import { assertNoOverbooking } from "./overbooking";
import type { Reservation } from "@/mocks/hotelData";

export type RoomBlock = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason: string;
  createdAt: string;
};

export const blockKeys = {
  all: ["room-blocks"] as const,
};

let store: RoomBlock[] = [];

export function listBlocks(): RoomBlock[] {
  return store.map((row) => ({ ...row }));
}

export function replaceBlocks(rows: RoomBlock[] | undefined | null) {
  store = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
}

function newBlockId() {
  try {
    return `blk-${crypto.randomUUID()}`;
  } catch {
    return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createBlock(
  input: { roomId: string; checkIn: string; checkOut: string; reason: string },
  reservations: Reservation[],
): RoomBlock {
  const reason = input.reason.trim();
  if (reason.length < 2 || reason.length > 80) {
    throw new Error("Informe um motivo curto (2 a 80 caracteres).");
  }
  assertValidPeriod(input.checkIn, input.checkOut);
  assertNoOverbooking(
    reservations,
    {
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    },
    store,
  );
  const block: RoomBlock = {
    id: newBlockId(),
    roomId: input.roomId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    reason,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store = [...store, block];
  return { ...block };
}

export function removeBlock(id: string) {
  const next = store.filter((row) => row.id !== id);
  if (next.length === store.length) throw new Error("Bloqueio não encontrado");
  store = next;
}
