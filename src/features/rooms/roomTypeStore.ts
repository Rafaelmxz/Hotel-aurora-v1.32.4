/**
 * Ficha do tipo de quarto: foto, texto, comodidades, adultos/crianças.
 * Hotel edita. Site só lê. Mapa não muda faixa.
 * Proibido: tarifário, Experiências, ouro, OTA, criar tipo novo.
 * Cofre: `roomTypes`. Vault antigo usa o catálogo da vitrine.
 */
import type { RoomType } from "@/mocks/hotelData";
import { ROOM_CATALOG } from "@/features/direct-booking/catalog";

export const roomTypeKeys = {
  all: ["room-types"] as const,
};

export type RoomTypeProfile = {
  type: RoomType;
  photo: string;
  description: string;
  amenities: string[];
  maxAdults: number;
  maxChildren: number;
};

const ORDER: RoomType[] = ["Standard", "Luxo", "Suíte"];

const DEFAULT_OCCUPANCY: Record<RoomType, { maxAdults: number; maxChildren: number }> = {
  Standard: { maxAdults: 2, maxChildren: 1 },
  Luxo: { maxAdults: 2, maxChildren: 1 },
  Suíte: { maxAdults: 2, maxChildren: 2 },
};

function seed(): RoomTypeProfile[] {
  return ORDER.map((type) => {
    const item = ROOM_CATALOG.find((row) => row.type === type)!;
    return {
      type,
      photo: item.photo,
      description: item.description,
      amenities: [...item.highlights],
      ...DEFAULT_OCCUPANCY[type],
    };
  });
}

const DEFAULTS = seed();

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function occupancyOfType(row: RoomTypeProfile) {
  return row.maxAdults + row.maxChildren;
}

export function typeHoldsParty(row: RoomTypeProfile, adults: number, children: number) {
  const a = Math.max(1, adults);
  const c = Math.max(0, children);
  return a <= row.maxAdults && c <= row.maxChildren && a + c <= occupancyOfType(row);
}

export function assertTypeHoldsParty(type: RoomType, adults: number, children: number) {
  const row = roomTypeByName(type);
  if (!typeHoldsParty(row, adults, children)) {
    throw new Error(
      `Capacidade excedida: ${type} cabe ${row.maxAdults} adulto(s) e ${row.maxChildren} criança(s).`,
    );
  }
}

export function normalizeRoomTypes(raw?: RoomTypeProfile[] | null): RoomTypeProfile[] {
  const byType = new Map((raw ?? []).map((row) => [row.type, row]));
  return DEFAULTS.map((def) => {
    const row = byType.get(def.type);
    const amenities = (row?.amenities ?? def.amenities)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    return {
      type: def.type,
      photo: row?.photo?.trim() || def.photo,
      description: row?.description?.trim() || def.description,
      amenities: amenities.length ? amenities : [...def.amenities],
      maxAdults: clamp(row?.maxAdults, 1, 6, def.maxAdults),
      maxChildren: clamp(row?.maxChildren, 0, 4, def.maxChildren),
    };
  });
}

let store: RoomTypeProfile[] = seed();

export function listRoomTypes(): RoomTypeProfile[] {
  store = normalizeRoomTypes(store);
  return store.map((row) => ({ ...row, amenities: [...row.amenities] }));
}

export function replaceRoomTypes(rows: RoomTypeProfile[]) {
  store = normalizeRoomTypes(rows);
}

export function saveRoomTypes(rows: RoomTypeProfile[]): RoomTypeProfile[] {
  store = normalizeRoomTypes(rows);
  return listRoomTypes();
}

export function roomTypeByName(type: RoomType) {
  return listRoomTypes().find((row) => row.type === type) ?? normalizeRoomTypes()[0]!;
}

export function typeFitsParty(row: RoomTypeProfile, adults: number, children: number) {
  return adults <= row.maxAdults && children <= row.maxChildren;
}
