import {
  reservations as seedReservations,
  roomById,
  TODAY,
  TODAY_ISO,
  toISODate,
  type GuestFnrh,
  type Reservation,
  type ReservationStatus,
} from "@/mocks/hotelData";
import { addDays } from "date-fns";
import { quoteStay, type QuoteOptions } from "@/features/rates/pricing";
import { assertValidEmail } from "@/lib/email";
import { assertValidPeriod } from "@/lib/hotel/rules";
import { assertNoOverbooking, availableRoomsByType } from "./overbooking";
import { listBlocks } from "./blockStore";
import { listSaleCloses } from "./saleCloseStore";
import { assertTypeHoldsParty } from "@/features/rooms/roomTypeStore";

export const reservationKeys = {
  all: ["reservations"] as const,
};

let store: Reservation[] = seedReservations.map((row) => ({ ...row }));

function applyQuote(reservation: Reservation): Reservation {
  const room = roomById(reservation.roomId);
  if (!room) return reservation;
  const quote = quoteStay(room.type, reservation.checkIn, reservation.checkOut);
  return {
    ...reservation,
    nightlyRate: quote.averageNight,
    totalAmount: quote.total,
  };
}

export function listReservations(): Reservation[] {
  return store.map((row) => ({ ...row }));
}

export function replaceReservations(rows: Reservation[]) {
  store = rows.map((row) => ({ ...row }));
  createSeq = store.length + 1;
}

export type ReservationPatch = {
  status?: ReservationStatus;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  receptionNotes?: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  fnrh?: GuestFnrh;
};

export function patchReservation(id: string, patch: ReservationPatch): Reservation {
  const index = store.findIndex((row) => row.id === id);
  if (index < 0) {
    throw new Error("Reserva não encontrada");
  }
  let next: Reservation = { ...store[index]!, ...patch };
  if (patch.roomId || patch.checkIn || patch.checkOut) {
    next = applyQuote(next);
  }
  store = [...store.slice(0, index), next, ...store.slice(index + 1)];
  return { ...next };
}

export function quoteNewReservation(
  roomId: string,
  checkIn: string,
  checkOut: string,
  options: QuoteOptions = {},
) {
  const room = roomById(roomId);
  if (!room) throw new Error("Quarto não encontrado");
  return quoteStay(room.type, checkIn, checkOut, options);
}

let createSeq = store.length + 1;

function newStayId() {
  try {
    return `res-${crypto.randomUUID()}`;
  } catch {
    return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createReservation(input: {
  roomId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  notes?: string;
  status?: ReservationStatus;
  origin?: string;
  allowOverbooking?: boolean;
  id?: string;
  guests?: number;
  adults?: number;
  children?: number;
  guestPhone?: string;
  holdUntil?: string;
  pix?: boolean;
}): Reservation {
  const room = roomById(input.roomId);
  if (!room) throw new Error("Quarto não encontrado");
  const children = Math.max(0, input.children ?? 0);
  const adults = Math.max(1, input.adults ?? input.guests ?? 1);
  if ((input.origin ?? "Balcão") === "Link público") {
    assertTypeHoldsParty(room.type, adults, children);
  }
  assertValidPeriod(input.checkIn, input.checkOut);
  assertNoOverbooking(
    store,
    {
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    },
    listBlocks(),
    listSaleCloses(),
  );
  const publicStay = (input.origin ?? "Balcão") === "Link público";
  const quote = quoteStay(room.type, input.checkIn, input.checkOut, {
    adults,
    children,
    segment: publicStay ? "site" : "balcao",
    pix: publicStay ? Boolean(input.pix) : false,
  });
  const email = input.guestEmail.trim();
  const reservation: Reservation = {
    id: input.id ?? newStayId(),
    roomId: input.roomId,
    guestName: input.guestName.trim(),
    guestEmail: email ? assertValidEmail(email) : "",
    guests: Math.max(1, input.guests ?? 1),
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    status: input.status ?? "confirmada",
    nightlyRate: quote.averageNight,
    totalAmount: quote.total,
    origin: input.origin ?? "Balcão",
    createdAt: TODAY_ISO,
    notes: input.notes,
    guestPhone: input.guestPhone?.trim() || undefined,
    holdUntil: input.holdUntil,
  };
  createSeq += 1;
  store = [...store, reservation];
  return { ...reservation };
}

function seedPublicPending() {
  const existing = store.filter(
    (row) => row.origin === "Link público" && row.status === "pendente",
  );
  if (existing.length >= 3) return;
  const checkIn = TODAY_ISO;
  const checkOut = toISODate(addDays(TODAY, 3));
  const checkOutB = toISODate(addDays(TODAY, 2));
  const checkOutC = toISODate(addDays(TODAY, 4));
  const grouped = availableRoomsByType(store, checkIn, checkOut, undefined, listBlocks(), listSaleCloses());
  const rooms = Object.values(grouped).flat();
  const extras = [
    { id: "res-link-demo", name: "Rafael Cruz", email: "rafael.cruz@email.com", out: checkOut },
    { id: "res-link-demo-2", name: "Marina Costa", email: "marina.costa@email.com", out: checkOutB },
    { id: "res-link-demo-3", name: "Paulo Nogueira", email: "paulo.nogueira@email.com", out: checkOutC },
  ].filter((item) => !store.some((row) => row.id === item.id));

  for (const extra of extras) {
    const room = rooms.shift();
    if (!room) break;
    const quote = quoteStay(room.type, checkIn, extra.out);
    store = [
      ...store,
      {
        id: extra.id,
        roomId: room.id,
        guestName: extra.name,
        guestEmail: extra.email,
        guests: 2,
        checkIn,
        checkOut: extra.out,
        status: "pendente",
        nightlyRate: quote.averageNight,
        totalAmount: quote.total,
        origin: "Link público",
        notes: `Sinal Pix 30% · comprovante: pix-${extra.id}.pdf · quarto ${room.number}`,
      },
    ];
  }
}

seedPublicPending();
