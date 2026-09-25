import { VAULT_VERSION, type HotelVault, type OccupancyStay } from "./types";
import type { Reservation } from "@/mocks/hotelData";
import type { ConsumoItem, PagamentoItem } from "@/features/reservations/types/folio";
import type { RoomBlock } from "@/features/reservations/blockStore";
import type { SaleClose } from "@/features/reservations/saleCloseStore";

function asSaleCloses(value: unknown): SaleClose[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is SaleClose => {
    if (!row || typeof row !== "object") return false;
    const close = row as SaleClose;
    return (
      typeof close.id === "string" &&
      typeof close.roomType === "string" &&
      typeof close.checkIn === "string" &&
      typeof close.checkOut === "string" &&
      typeof close.reason === "string"
    );
  });
}

function asBlocks(value: unknown): RoomBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is RoomBlock => {
    if (!row || typeof row !== "object") return false;
    const block = row as RoomBlock;
    return (
      typeof block.id === "string" &&
      typeof block.roomId === "string" &&
      typeof block.checkIn === "string" &&
      typeof block.checkOut === "string" &&
      typeof block.reason === "string"
    );
  });
}

export function isVault(value: unknown): value is HotelVault {
  if (!value || typeof value !== "object") return false;
  const vault = value as HotelVault;
  return vault.version === VAULT_VERSION && Array.isArray(vault.reservations);
}

export function parseVault(payload: string | null | undefined): HotelVault | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!isVault(parsed)) return null;
    return { ...parsed, blocks: asBlocks(parsed.blocks), saleCloses: asSaleCloses(parsed.saleCloses) };
  } catch {
    return null;
  }
}

export function occupancyOf(reservations: Reservation[]): OccupancyStay[] {
  return reservations.map((row) => ({
    id: row.id,
    roomId: row.roomId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    status: row.status,
  }));
}

export function mergeReservations(base: Reservation[], extras: Reservation[]): Reservation[] {
  const ids = new Set(base.map((row) => row.id));
  const out = [...base];
  for (const extra of extras) {
    if (ids.has(extra.id)) continue;
    out.push(extra);
    ids.add(extra.id);
  }
  return out;
}

export function mergeBlocks(base: RoomBlock[], extras: RoomBlock[]): RoomBlock[] {
  const ids = new Set(base.map((row) => row.id));
  const out = [...base];
  for (const extra of extras) {
    if (!extra?.id || ids.has(extra.id)) continue;
    out.push(extra);
    ids.add(extra.id);
  }
  return out;
}

export function mergeSaleCloses(base: SaleClose[], extras: SaleClose[]): SaleClose[] {
  const ids = new Set(base.map((row) => row.id));
  const out = [...base];
  for (const extra of extras) {
    if (!extra?.id || ids.has(extra.id)) continue;
    out.push(extra);
    ids.add(extra.id);
  }
  return out;
}

export function mergePagamentos(base: PagamentoItem[], extras: PagamentoItem[]): PagamentoItem[] {
  const ids = new Set(base.map((row) => row.id));
  const out = [...base];
  for (const extra of extras) {
    if (!extra?.id || ids.has(extra.id)) continue;
    out.push(extra);
    ids.add(extra.id);
  }
  return out;
}

export function mergeConsumos(base: ConsumoItem[], extras: ConsumoItem[]): ConsumoItem[] {
  const ids = new Set(base.map((row) => row.id));
  const out = [...base];
  for (const extra of extras) {
    if (!extra?.id || ids.has(extra.id)) continue;
    out.push(extra);
    ids.add(extra.id);
  }
  return out;
}

export function isSiteBooking(row: Pick<Reservation, "origin">) {
  return row.origin === "Link público";
}

function asConsumo(raw: unknown, reservaId: string): ConsumoItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as ConsumoItem;
  if (
    typeof row.id !== "string" ||
    typeof row.descricao !== "string" ||
    typeof row.valor !== "number" ||
    row.valor < 0 ||
    typeof row.quantidade !== "number" ||
    row.quantidade < 1
  ) {
    return null;
  }
  return {
    id: row.id,
    reserva_id: row.reserva_id || reservaId,
    descricao: row.descricao,
    valor: row.valor,
    quantidade: row.quantidade,
    data_lancamento: row.data_lancamento || new Date().toISOString().slice(0, 10),
  };
}

export function splitPublicPending(raw: unknown): {
  reservation: Reservation;
  deposit?: PagamentoItem;
  consumos: ConsumoItem[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Reservation & { deposit?: PagamentoItem; extras?: unknown; consumos?: unknown };
  if (!row.id || !row.roomId || !row.checkIn || !row.checkOut) return null;
  const { deposit, extras, consumos, ...rest } = row;
  const reservation = rest as Reservation;
  const fromList = Array.isArray(consumos) ? consumos : Array.isArray(extras) ? extras : [];
  const parsedConsumos = fromList
    .map((item) => asConsumo(item, reservation.id))
    .filter((item): item is ConsumoItem => Boolean(item));
  if (
    deposit &&
    typeof deposit === "object" &&
    typeof deposit.id === "string" &&
    typeof deposit.valor === "number" &&
    deposit.valor > 0
  ) {
    return {
      reservation,
      deposit: {
        ...deposit,
        reserva_id: deposit.reserva_id || reservation.id,
      },
      consumos: parsedConsumos,
    };
  }
  return { reservation, consumos: parsedConsumos };
}

export function absorbSiteBookings(
  target: HotelVault,
  slice: {
    reservations?: Reservation[];
    pagamentos?: PagamentoItem[];
    consumos?: ConsumoItem[];
  } | null,
): HotelVault {
  if (!slice) return target;
  const extras = (slice.reservations ?? []).filter(isSiteBooking);
  const mergedRes = mergeReservations(target.reservations, extras);
  const mergedPays = mergePagamentos(target.pagamentos ?? [], slice.pagamentos ?? []);
  const mergedConsumos = mergeConsumos(target.consumos ?? [], slice.consumos ?? []);
  if (
    mergedRes.length === target.reservations.length &&
    mergedPays.length === (target.pagamentos ?? []).length &&
    mergedConsumos.length === (target.consumos ?? []).length
  ) {
    return target;
  }
  return {
    ...target,
    reservations: mergedRes,
    pagamentos: mergedPays,
    consumos: mergedConsumos,
  };
}

/** Une duas cópias do cofre: o preferido ganha em id repetido; o outro só acrescenta o que falta. */
export function unionVaultReservations(preferred: HotelVault, other: HotelVault | null): HotelVault {
  if (!other) return preferred;
  const reservations = mergeReservations(preferred.reservations, other.reservations);
  const pagamentos = mergePagamentos(preferred.pagamentos ?? [], other.pagamentos ?? []);
  const consumos = mergeConsumos(preferred.consumos ?? [], other.consumos ?? []);
  const blocks = mergeBlocks(preferred.blocks ?? [], other.blocks ?? []);
  const saleCloses = mergeSaleCloses(preferred.saleCloses ?? [], other.saleCloses ?? []);
  if (
    reservations.length === preferred.reservations.length &&
    pagamentos.length === (preferred.pagamentos ?? []).length &&
    consumos.length === (preferred.consumos ?? []).length &&
    blocks.length === (preferred.blocks ?? []).length &&
    saleCloses.length === (preferred.saleCloses ?? []).length
  ) {
    return preferred;
  }
  return {
    ...preferred,
    reservations,
    pagamentos,
    consumos,
    blocks,
    saleCloses,
  };
}

export function absorbPublicPendings(target: HotelVault, remote: HotelVault | null): HotelVault {
  if (!remote) return target;
  return absorbSiteBookings(target, {
    reservations: remote.reservations.filter(
      (row) => isSiteBooking(row) && (row.status === "pendente" || row.status === "confirmada"),
    ),
    pagamentos: remote.pagamentos,
    consumos: remote.consumos,
  });
}
