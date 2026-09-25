/**
 * Fecha venda por tipo e datas. Não é reserva nem bloqueio de quarto.
 * Tela: aba Hotel, /calendario e calendário em Tarifas.
 * Proibido: mudar preço, Experiências, ouro, OTA, folio.
 * Store → cofre (`saleCloses`). Vault antigo = lista vazia.
 */
import type { RoomType } from "@/mocks/hotelData";
import { assertValidPeriod } from "@/lib/hotel/rules";

export type SaleClose = {
  id: string;
  roomType: RoomType | "todas";
  checkIn: string;
  checkOut: string;
  reason: string;
  createdAt: string;
};

export const saleCloseKeys = {
  all: ["sale-closes"] as const,
};

let store: SaleClose[] = [];

export function listSaleCloses(): SaleClose[] {
  return store.map((row) => ({ ...row }));
}

export function replaceSaleCloses(rows: SaleClose[] | undefined | null) {
  store = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
}

function newCloseId() {
  try {
    return `cls-${crypto.randomUUID()}`;
  } catch {
    return `cls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createSaleClose(input: {
  roomType: RoomType | "todas";
  checkIn: string;
  checkOut: string;
  reason: string;
}): SaleClose {
  const reason = input.reason.trim();
  if (reason.length < 2 || reason.length > 80) {
    throw new Error("Informe um motivo curto (2 a 80 caracteres).");
  }
  if (input.roomType !== "todas" && !["Standard", "Luxo", "Suíte"].includes(input.roomType)) {
    throw new Error("Informe o tipo de quarto.");
  }
  assertValidPeriod(input.checkIn, input.checkOut);
  const row: SaleClose = {
    id: newCloseId(),
    roomType: input.roomType,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    reason,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store = [...store, row];
  return { ...row };
}

export function removeSaleClose(id: string) {
  const next = store.filter((row) => row.id !== id);
  if (next.length === store.length) throw new Error("Fechamento não encontrado");
  store = next;
}

export function closeCoversType(row: SaleClose, roomType: RoomType) {
  return row.roomType === "todas" || row.roomType === roomType;
}
