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
import {
  dumpAudit,
  mergeAudit,
  replaceAudit,
  SITE_AUDIT_ACTOR,
  siteCreateEvents,
} from "@/features/audit/auditStore";
import { listGuests } from "@/features/guests/guestStore";
import { listBlocks, replaceBlocks } from "@/features/reservations/blockStore";
import { listSaleCloses, replaceSaleCloses } from "@/features/reservations/saleCloseStore";
import { listRoomTypes, replaceRoomTypes } from "@/features/rooms/roomTypeStore";
import type { Reservation } from "@/mocks/hotelData";
import {
  VAULT_VERSION,
  type HotelMembershipRole,
  type HotelVault,
  type OccupancyStay,
  type PublicStayPayload,
} from "./types";
import { absorbSiteBookings, isSiteBooking, parseVault, unionVaultReservations } from "./parse";
import { readLocalVault, writeLocalVault } from "./local";

export function snapshotVault(): HotelVault {
  return {
    version: VAULT_VERSION,
    savedAt: Date.now(),
    rooms: listRooms(),
    reservations: listReservations(),
    blocks: listBlocks(),
    saleCloses: listSaleCloses(),
    consumos: listAllConsumos(),
    pagamentos: listAllPagamentos(),
    guests: listGuests(),
    cashCloses: listCashCloses(),
    property: getProperty(),
    booking: getBookingConfig(),
    roomTypes: listRoomTypes(),
    rates: {
      categories: listCategoryRates(),
      seasons: listSeasons(),
      packages: listPackages(),
      promos: listPromos(),
    },
    offers: listOffers(),
    staff: dumpStaff(),
    audit: dumpAudit(),
  };
}

export function applyVault(vault: HotelVault) {
  if (vault.rooms?.length) replaceRooms(vault.rooms);
  if (vault.reservations) replaceReservations(vault.reservations);
  replaceBlocks(vault.blocks ?? []);
  replaceSaleCloses(vault.saleCloses ?? []);
  replaceFolio({
    consumos: vault.consumos ?? [],
    pagamentos: vault.pagamentos ?? [],
  });
  if (vault.property) replaceProperty(vault.property);
  if (vault.booking) replaceBookingConfig(vault.booking);
  if (vault.property && !vault.property.cancellationPolicy && vault.booking?.cancellationPolicy) {
    replaceProperty({
      ...getProperty(),
      cancellationPolicy: vault.booking.cancellationPolicy,
    });
  }
  if (vault.rates) replaceRates(vault.rates);
  if (vault.offers) replaceOffers(vault.offers);
  if (vault.roomTypes) replaceRoomTypes(vault.roomTypes);
  if (vault.cashCloses) replaceCashCloses(vault.cashCloses);
  if (vault.staff?.length) replaceStaff(vault.staff);
  replaceAudit(mergeAudit(vault.audit, dumpAudit()));
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
  const local = readLocalVault();
  if (local?.property) {
    replaceProperty(local.property);
  } else if (data.property) {
    replaceProperty({
      ...data.property,
      cancellationPolicy:
        data.property.cancellationPolicy || data.booking?.cancellationPolicy || "",
      checkInTime: data.property.checkInTime || data.booking?.checkInTime || "14:00",
      checkOutTime: data.property.checkOutTime || data.booking?.checkOutTime || "12:00",
    });
  }
  if (data.booking) replaceBookingConfig(data.booking);
  if (data.rates) replaceRates(data.rates);
  if (data.offers) replaceOffers(data.offers);
  if (local?.roomTypes?.length) replaceRoomTypes(local.roomTypes);
  else if (data.roomTypes?.length) replaceRoomTypes(data.roomTypes);
  replaceBlocks(data.blocks ?? []);
  if (local?.saleCloses?.length) replaceSaleCloses(local.saleCloses);
  else replaceSaleCloses(data.saleCloses ?? []);
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

let vaultIo: Promise<unknown> = Promise.resolve();
let vaultMode: "staff" | "public" = "staff";
let lastMembershipRole: HotelMembershipRole = "recepcionista";

function withVaultIo<T>(fn: () => Promise<T>): Promise<T> {
  const run = vaultIo.catch(() => undefined).then(fn);
  vaultIo = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function vaultWithRamAudit(vault: HotelVault): HotelVault {
  return { ...vault, audit: dumpAudit() };
}

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
    const vault = next === base ? base : { ...next, savedAt: Date.now() };
    const stamped = new Set(
      (vault.audit ?? [])
        .filter((row) => row.action === "reserva.criar" && row.staffId === SITE_AUDIT_ACTOR.staffId)
        .map((row) => row.target),
    );
    const unstamped = vault.reservations.filter((row) => isSiteBooking(row) && !stamped.has(row.id));
    if (unstamped.length === 0 && next === base) return base;
    return {
      ...vault,
      savedAt: Date.now(),
      audit: mergeAudit(vault.audit, siteCreateEvents(unstamped)),
    };
  } catch {
    return base;
  }
}

async function persistVaultNow() {
  if (detectVaultMode() === "public" || vaultMode === "public") return;
  let vault = snapshotVault();
  writeLocalVault(vault);
  const ingested = await ingestSiteBookings(vault);
  if (ingested !== vault) {
    applyVault(ingested);
    vault = vaultWithRamAudit(ingested);
    writeLocalVault(vault);
  }
  await pushVault(vault).catch(() => undefined);
}

export async function persistVault() {
  if (detectVaultMode() === "public" || vaultMode === "public") return;
  return withVaultIo(persistVaultNow);
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

async function restoreVaultNow() {
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
      await persistVaultNow();
      return snapshotVault();
    }
    vault = await ingestSiteBookings(vault);
    applyVault(vault);
    vault = vaultWithRamAudit(vault);
    writeLocalVault(vault);
    if (!remote || vault.reservations.length !== remote.reservations.length) {
      await pushVault(vault).catch(() => undefined);
    }
    return vault;
  } catch {
    let vault = local;
    if (!vault) return snapshotVault();
    const before = vault.reservations.length;
    vault = await ingestSiteBookings(vault);
    applyVault(vault);
    vault = vaultWithRamAudit(vault);
    writeLocalVault(vault);
    if (vault.reservations.length !== before) {
      await pushVault(vault).catch(() => undefined);
    }
    return vault;
  }
}

export async function restoreVault() {
  vaultMode = "staff";
  return withVaultIo(restoreVaultNow);
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
