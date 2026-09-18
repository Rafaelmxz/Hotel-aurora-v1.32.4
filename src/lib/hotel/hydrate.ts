import { replaceReservations, listReservations } from "@/features/reservations/reservationStore";
import { replaceRooms, listRooms } from "@/features/rooms/roomStore";
import {
  replaceFolio,
  listAllConsumos,
  listAllPagamentos,
} from "@/features/reservations/folioStore";
import { replaceProperty, getProperty } from "@/features/settings/propertyStore";
import {
  replaceBookingConfig,
  getBookingConfig,
} from "@/features/direct-booking/bookingStore";
import {
  replaceRates,
  listCategoryRates,
  listPackages,
  listPromos,
  listSeasons,
} from "@/features/rates/rateStore";
import { replaceOffers, listOffers } from "@/features/rates/offerStore";
import { replaceCashCloses, listCashCloses } from "@/features/finance/cashStore";
import { dumpStaff, replaceStaff } from "@/features/users/userStore";
import { listGuests } from "@/features/guests/guestStore";
import type { Reservation } from "@/mocks/hotelData";
import {
  VAULT_VERSION,
  type HotelMembershipRole,
  type HotelVault,
  type OccupancyStay,
  type PublicStayPayload,
} from "./types";
import { absorbSiteBookings, parseVault, unionVaultReservations } from "./parse";
import { readLocalVault, writeLocalVault } from "./local";

export function snapshotVault(): HotelVault {
  return {
    version: VAULT_VERSION,
    savedAt: Date.now(),
    rooms: listRooms(),
    reservations: listReservations(),
    consumos: listAllConsumos(),
    pagamentos: listAllPagamentos(),
    guests: listGuests(),
    cashCloses: listCashCloses(),
    property: getProperty(),
    booking: getBookingConfig(),
    rates: {
      categories: listCategoryRates(),
      seasons: listSeasons(),
      packages: listPackages(),
      promos: listPromos(),
    },
    offers: listOffers(),
    staff: dumpStaff(),
  };
}

export function applyVault(vault: HotelVault) {
  if (vault.rooms?.length) replaceRooms(vault.rooms);
  if (vault.reservations) replaceReservations(vault.reservations);
  replaceFolio({
    consumos: vault.consumos ?? [],
    pagamentos: vault.pagamentos ?? [],
  });
  if (vault.property) replaceProperty(vault.property);
  if (vault.booking) replaceBookingConfig(vault.booking);
  if (vault.rates) replaceRates(vault.rates);
  if (vault.offers) replaceOffers(vault.offers);
  if (vault.cashCloses) replaceCashCloses(vault.cashCloses);
  if (vault.staff?.length) replaceStaff(vault.staff);
}

function occupancyToReservation(row: OccupancyStay): Reservation {
  return {
    id: row.id,
    roomId: row.roomId,
    guestName: "",
    guestEmail: "ocupacao@hotel.local",
    guests: 1,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    status: row.status,
    nightlyRate: 0,
    totalAmount: 0,
    origin: "Ocupação",
  };
}

export function applyPublicStay(data: PublicStayPayload) {
  if (data.rooms?.length) replaceRooms(data.rooms);
  if (data.property) replaceProperty(data.property);
  if (data.booking) replaceBookingConfig(data.booking);
  if (data.rates) replaceRates(data.rates);
  if (data.offers) replaceOffers(data.offers);
  const stubs = data.occupancy.map(occupancyToReservation);
  if (data.hasVault) {
    replaceReservations(stubs);
    return;
  }
  if (!stubs.length) return;
  const current = listReservations();
  const ids = new Set(current.map((row) => row.id));
  const extras = stubs.filter((row) => !ids.has(row.id));
  if (extras.length) replaceReservations([...current, ...extras]);
}

async function pushVault(vault: HotelVault) {
  const { pushHotelVaultFn } = await import("./api");
  await pushHotelVaultFn({ data: { payload: JSON.stringify(vault) } });
}

export function bootVaultFromLocal() {
  const local = readLocalVault();
  if (local) applyVault(local);
}

let persistChain: Promise<void> = Promise.resolve();
let vaultMode: "staff" | "public" = "staff";
let lastMembershipRole: HotelMembershipRole = "recepcionista";

export function getLastMembershipRole() {
  return lastMembershipRole;
}

export function detectVaultMode(): "staff" | "public" {
  if (typeof window === "undefined") return vaultMode;
  const path = window.location.pathname;
  if (path === "/reservar" || path.startsWith("/reservar/") || path === "/login") {
    return "public";
  }
  return "staff";
}

export function setVaultMode(mode: "staff" | "public") {
  vaultMode = mode;
}

export function resetVaultRestore() {
  restored = null;
}

async function ingestSiteBookings(base: HotelVault): Promise<HotelVault> {
  try {
    const { pullPublicBookingsFn } = await import("./api");
    const slice = await pullPublicBookingsFn();
    const next = absorbSiteBookings(base, slice);
    if (next === base) return base;
    return { ...next, savedAt: Date.now() };
  } catch {
    return base;
  }
}

function schedulePush(vault: HotelVault) {
  persistChain = persistChain
    .catch(() => undefined)
    .then(() => pushVault(vault))
    .catch(() => undefined);
  return persistChain;
}

export async function persistVault() {
  if (detectVaultMode() === "public" || vaultMode === "public") return;
  let vault = snapshotVault();
  const ingested = await ingestSiteBookings(vault);
  if (ingested !== vault) {
    applyVault(ingested);
    vault = ingested;
  }
  writeLocalVault(vault);
  persistChain = persistChain
    .catch(() => undefined)
    .then(() => pushVault(vault))
    .catch(() => undefined);
  await persistChain;
}

export async function restorePublicStay() {
  vaultMode = "public";
  try {
    const { pullPublicStayFn } = await import("./api");
    const payload = await pullPublicStayFn();
    applyPublicStay(payload);
    return payload;
  } catch {
    return null;
  }
}

export async function restoreVault() {
  vaultMode = "staff";
  const local = readLocalVault();
  try {
    const { pullHotelVaultFn } = await import("./api");
    const pulled = await pullHotelVaultFn();
    lastMembershipRole = pulled.role;
    const remote = parseVault(pulled.payload);
    const preferred =
      local && remote
        ? (local.savedAt ?? 0) >= (remote.savedAt ?? 0)
          ? local
          : remote
        : (local ?? remote);
    const other = preferred && local && remote ? (preferred === local ? remote : local) : null;
    let vault = preferred ? unionVaultReservations(preferred, other) : null;
    if (!vault) {
      await persistVault();
      return snapshotVault();
    }
    vault = await ingestSiteBookings(vault);
    applyVault(vault);
    writeLocalVault(vault);
    if (!remote || vault.reservations.length !== remote.reservations.length) {
      await schedulePush(vault);
    }
    return vault;
  } catch {
    let vault = local;
    if (!vault) return snapshotVault();
    const before = vault.reservations.length;
    vault = await ingestSiteBookings(vault);
    applyVault(vault);
    writeLocalVault(vault);
    if (vault.reservations.length !== before) {
      await schedulePush(vault);
    }
    return vault;
  }
}

let restored: Promise<HotelVault> | null = null;

export function ensureVaultRestored() {
  const mode = detectVaultMode();
  vaultMode = mode;
  if (!restored) {
    restored =
      mode === "public"
        ? restorePublicStay().then(() => snapshotVault())
        : restoreVault();
  }
  return restored;
}
