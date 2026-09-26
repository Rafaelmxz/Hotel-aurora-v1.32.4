import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const HOTEL_NAME = "Hotel Aurora";

export type RoomType = "Standard" | "Luxo" | "Suíte";
export type HousekeepingStatus = "limpo" | "sujo" | "em_limpeza" | "manutencao";
export type ReservationStatus =
  | "pendente"
  | "confirmada"
  | "check-in"
  | "check-out"
  | "cancelada";

export type Room = {
  id: string;
  number: string;
  type: RoomType;
  floor: number;
  capacity: number;
  nightlyRate: number;
};

export type GuestFnrh = {
  document: string;
  birthDate: string;
  nationality: string;
  profession: string;
  originCity: string;
  nextCity: string;
};

export type Reservation = {
  id: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  totalAmount: number;
  nightlyRate: number;
  origin: string;
  createdAt?: string;
  notes?: string;
  holdUntil?: string;
  guestPhone?: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  receptionNotes?: string;
  fnrh?: GuestFnrh;
};

export type MonthlyMetric = {
  month: string;
  monthIndex: number;
  revenue: number;
  occupancy: number;
};

export type DashboardStats = {
  occupied: number;
  vacant: number;
  checkInsToday: number;
  checkOutsToday: number;
  forecastRevenue: number;
  receivedRevenue: number;
  occupancyToday: number;
  totalRooms: number;
};

export const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const rooms: Room[] = [
  { id: "room-101", number: "101", type: "Standard", floor: 1, capacity: 2, nightlyRate: 320 },
  { id: "room-102", number: "102", type: "Standard", floor: 1, capacity: 2, nightlyRate: 320 },
  { id: "room-103", number: "103", type: "Standard", floor: 1, capacity: 3, nightlyRate: 360 },
  { id: "room-201", number: "201", type: "Luxo", floor: 2, capacity: 2, nightlyRate: 540 },
  { id: "room-202", number: "202", type: "Luxo", floor: 2, capacity: 2, nightlyRate: 560 },
  { id: "room-203", number: "203", type: "Luxo", floor: 2, capacity: 3, nightlyRate: 610 },
  { id: "room-301", number: "301", type: "Suíte", floor: 3, capacity: 4, nightlyRate: 890 },
  { id: "room-302", number: "302", type: "Suíte", floor: 3, capacity: 4, nightlyRate: 940 },
  { id: "room-401", number: "401", type: "Standard", floor: 4, capacity: 2, nightlyRate: 340 },
  { id: "room-402", number: "402", type: "Luxo", floor: 4, capacity: 3, nightlyRate: 580 },
];

const GUESTS = [
  "Ana Ribeiro",
  "Bruno Costa",
  "Camila Ferreira",
  "Diego Almeida",
  "Elena Souza",
  "Felipe Martins",
  "Gabriela Lima",
  "Henrique Dias",
  "Isabel Rocha",
  "João Mendes",
  "Karina Nunes",
  "Lucas Barbosa",
  "Marina Teixeira",
  "Nicolas Prado",
  "Olivia Castro",
  "Paulo Vieira",
  "Quésia Moura",
  "Rafael Pinto",
  "Sofia Azevedo",
  "Thiago Ramos",
  "Vera Campos",
  "Vinícius Lopes",
  "Wanda Freitas",
  "Yara Cardoso",
  "Zeca Antunes",
  "Beatriz Moraes",
  "Caio Pacheco",
  "Daniela Brito",
  "Eduardo Sampaio",
  "Fernanda Duarte",
  "Gustavo Nogueira",
  "Helena Paiva",
  "Igor Vasconcelos",
  "Júlia Tavares",
  "Leandro Farias",
  "Marta Quintana",
];

const ORIGINS = ["Direto", "Booking.com", "Airbnb", "Expedia", "Website"] as const;

const NOTES = [
  "Chegada prevista após 21h.",
  "Berço extra solicitado.",
  "Aniversário na segunda noite.",
  "Preferência por andar alto.",
  "Transfer do aeroporto confirmado.",
  "Hóspede frequente — cortesia no minibar.",
];

/** Smaller gaps → higher occupancy. Values keep monthly occupancy in 40–85%. */
const GAP_BY_MONTH = [1, 1, 2, 2, 3, 4, 1, 2, 2, 2, 3, 1];

export const TODAY = startOfDay(new Date());
export const TODAY_ISO = format(TODAY, "yyyy-MM-dd");
export const CURRENT_YEAR = TODAY.getFullYear();

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function stayNights(checkIn: string, checkOut: string): number {
  return Math.max(1, differenceInCalendarDays(parseISODate(checkOut), parseISODate(checkIn)));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatStayRange(checkIn: string, checkOut: string): string {
  const start = parseISODate(checkIn);
  const end = parseISODate(checkOut);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "d", { locale: ptBR })}–${format(end, "d 'de' MMMM", { locale: ptBR })}`;
  }
  return `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM", { locale: ptBR })}`;
}

export function roomById(id: string): Room | undefined {
  return rooms.find((room) => room.id === id);
}

function mulberry32(seed: number) {
  return function rng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emailFromName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, ".") + "@email.com"
  );
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function overlapNights(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): number {
  const start = maxDate([aStart, bStart]);
  const end = minDate([aEnd, bEnd]);
  const nights = differenceInCalendarDays(end, start);
  return nights > 0 ? nights : 0;
}

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return overlapNights(aStart, aEnd, bStart, bEnd) > 0;
}

type StaySeed = {
  roomNumber: string;
  startOffset: number;
  nights: number;
  status?: ReservationStatus;
  guestName: string;
  origin?: string;
  notes?: string;
};

/**
 * Stays pinned to "today" so the dashboard and the 21-day map always look
 * occupied — arrivals, departures, in-house guests and empty rooms.
 */
const WINDOW_SEEDS: StaySeed[] = [
  { roomNumber: "101", startOffset: -2, nights: 5, guestName: "Ana Ribeiro", origin: "Direto", notes: "Hóspede frequente — cortesia no minibar." },
  { roomNumber: "101", startOffset: 5, nights: 4, guestName: "Lucas Barbosa", origin: "Booking.com" },
  { roomNumber: "101", startOffset: 10, nights: 3, status: "pendente", guestName: "Sofia Azevedo", origin: "Website" },
  { roomNumber: "102", startOffset: -4, nights: 9, guestName: "Bruno Costa", origin: "Expedia", notes: "Preferência por andar alto." },
  { roomNumber: "102", startOffset: 7, nights: 6, guestName: "Helena Paiva", origin: "Booking.com" },
  { roomNumber: "103", startOffset: 0, nights: 4, guestName: "Camila Ferreira", origin: "Direto", notes: "Chegada prevista após 21h." },
  { roomNumber: "103", startOffset: 6, nights: 3, status: "pendente", guestName: "Igor Vasconcelos", origin: "Airbnb" },
  { roomNumber: "103", startOffset: 12, nights: 4, guestName: "Marta Quintana", origin: "Website" },
  { roomNumber: "201", startOffset: -1, nights: 4, guestName: "Diego Almeida", origin: "Booking.com" },
  { roomNumber: "201", startOffset: 5, nights: 5, guestName: "Júlia Tavares", origin: "Direto", notes: "Aniversário na segunda noite." },
  { roomNumber: "201", startOffset: 12, nights: 3, status: "pendente", guestName: "Caio Pacheco", origin: "Expedia" },
  { roomNumber: "202", startOffset: 0, nights: 7, guestName: "Elena Souza", origin: "Airbnb", notes: "Berço extra solicitado." },
  { roomNumber: "202", startOffset: 9, nights: 4, guestName: "Leandro Farias", origin: "Booking.com" },
  { roomNumber: "203", startOffset: -3, nights: 3, guestName: "Felipe Martins", origin: "Direto" },
  { roomNumber: "203", startOffset: 2, nights: 4, guestName: "Daniela Brito", origin: "Website" },
  { roomNumber: "203", startOffset: 8, nights: 5, status: "pendente", guestName: "Gustavo Nogueira", origin: "Booking.com" },
  { roomNumber: "301", startOffset: 0, nights: 3, guestName: "Gabriela Lima", origin: "Direto", notes: "Transfer do aeroporto confirmado." },
  { roomNumber: "301", startOffset: 5, nights: 4, guestName: "Eduardo Sampaio", origin: "Expedia" },
  { roomNumber: "301", startOffset: 11, nights: 4, guestName: "Fernanda Duarte", origin: "Website" },
  { roomNumber: "302", startOffset: -2, nights: 8, guestName: "Henrique Dias", origin: "Booking.com" },
  { roomNumber: "302", startOffset: 8, nights: 3, status: "cancelada", guestName: "Yara Cardoso", origin: "Airbnb" },
  { roomNumber: "302", startOffset: 12, nights: 5, guestName: "Beatriz Moraes", origin: "Direto" },
  { roomNumber: "401", startOffset: -6, nights: 6, guestName: "Isabel Rocha", origin: "Website" },
  { roomNumber: "401", startOffset: 3, nights: 4, status: "pendente", guestName: "Paulo Vieira", origin: "Booking.com" },
  { roomNumber: "401", startOffset: 9, nights: 4, guestName: "Thiago Ramos", origin: "Expedia" },
  { roomNumber: "402", startOffset: -10, nights: 4, status: "cancelada", guestName: "Zeca Antunes", origin: "Airbnb" },
  { roomNumber: "402", startOffset: 4, nights: 3, status: "pendente", guestName: "Olivia Castro", origin: "Direto" },
  { roomNumber: "402", startOffset: 8, nights: 6, guestName: "Rafael Pinto", origin: "Booking.com" },
];

function inferStatus(
  checkIn: Date,
  checkOut: Date,
  today: Date,
  override?: ReservationStatus,
): ReservationStatus {
  if (override) return override;
  if (!isBefore(today, checkIn) && isBefore(today, checkOut)) return "check-in";
  if (isBefore(today, checkIn)) return "confirmada";
  return "confirmada";
}

function makeReservation(
  id: string,
  room: Room,
  checkIn: Date,
  checkOut: Date,
  today: Date,
  guestName: string,
  rng: () => number,
  override?: ReservationStatus,
  origin?: string,
  notes?: string,
): Reservation {
  const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));
  const jitter = 1 + (rng() - 0.5) * 0.08;
  const nightlyRate = Math.round(room.nightlyRate * jitter);
  const guests = 1 + Math.floor(rng() * room.capacity);
  return {
    id,
    roomId: room.id,
    guestName,
    guestEmail: emailFromName(guestName),
    guests,
    checkIn: toISODate(checkIn),
    checkOut: toISODate(checkOut),
    status: inferStatus(checkIn, checkOut, today, override),
    nightlyRate,
    totalAmount: nightlyRate * nights,
    origin: origin ?? pick(rng, ORIGINS),
    createdAt: toISODate(addDays(checkIn, -Math.max(1, Math.floor(rng() * 10)))),
    notes,
  };
}

function buildReservations(today: Date): Reservation[] {
  const rng = mulberry32(today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate());
  const yearStart = startOfYear(today);
  const yearEnd = addDays(addMonths(yearStart, 12), 0);
  const reservations: Reservation[] = [];
  const occupied = new Map<string, Array<{ start: Date; end: Date }>>();
  let seq = 1;

  const mark = (roomId: string, start: Date, end: Date) => {
    const list = occupied.get(roomId) ?? [];
    list.push({ start, end });
    occupied.set(roomId, list);
  };

  const isFree = (roomId: string, start: Date, end: Date) => {
    const list = occupied.get(roomId) ?? [];
    return list.every((range) => !rangesOverlap(start, end, range.start, range.end));
  };

  for (const seed of WINDOW_SEEDS) {
    const room = rooms.find((item) => item.number === seed.roomNumber);
    if (!room) continue;
    const checkIn = addDays(today, seed.startOffset);
    const checkOut = addDays(checkIn, seed.nights);
    reservations.push(
      makeReservation(
        `res-${String(seq++).padStart(3, "0")}`,
        room,
        checkIn,
        checkOut,
        today,
        seed.guestName,
        rng,
        seed.status,
        seed.origin,
        seed.notes,
      ),
    );
    mark(room.id, checkIn, checkOut);
  }

  let guestCursor = 0;
  for (const room of rooms) {
    let cursor = new Date(yearStart);
    while (isBefore(cursor, yearEnd)) {
      const month = cursor.getMonth();
      const gap = GAP_BY_MONTH[month]! + (rng() < 0.35 ? 1 : 0);
      const proposedStart = addDays(cursor, gap);
      if (!isBefore(proposedStart, yearEnd)) break;
      const stay = 2 + Math.floor(rng() * 5);
      const proposedEnd = addDays(proposedStart, stay);
      const checkOut = isBefore(proposedEnd, yearEnd) ? proposedEnd : yearEnd;

      if (differenceInCalendarDays(checkOut, proposedStart) < 1) {
        cursor = addDays(proposedStart, 1);
        continue;
      }

      if (!isFree(room.id, proposedStart, checkOut)) {
        cursor = addDays(proposedStart, 1);
        continue;
      }

      const demoStart = addDays(today, -14);
      const demoEnd = addDays(today, 21);
      if (rangesOverlap(proposedStart, checkOut, demoStart, demoEnd)) {
        if (
          isBefore(proposedStart, demoStart) &&
          differenceInCalendarDays(demoStart, proposedStart) >= 1 &&
          isFree(room.id, proposedStart, demoStart)
        ) {
          const guestName = GUESTS[guestCursor % GUESTS.length]!;
          guestCursor += 1;
          reservations.push(
            makeReservation(
              `res-${String(seq++).padStart(3, "0")}`,
              room,
              proposedStart,
              demoStart,
              today,
              guestName,
              rng,
              isBefore(demoStart, today) ? undefined : "confirmada",
              pick(rng, ORIGINS),
            ),
          );
          mark(room.id, proposedStart, demoStart);
        }
        cursor = demoEnd;
        continue;
      }

      const guestName = GUESTS[guestCursor % GUESTS.length]!;
      guestCursor += 1;
      let status: ReservationStatus | undefined;
      if (rng() < 0.07 && isBefore(checkOut, today)) status = "cancelada";
      else if (isBefore(today, proposedStart) && rng() < 0.22) status = "pendente";

      reservations.push(
        makeReservation(
          `res-${String(seq++).padStart(3, "0")}`,
          room,
          proposedStart,
          checkOut,
          today,
          guestName,
          rng,
          status,
          pick(rng, ORIGINS),
          rng() < 0.18 ? pick(rng, NOTES) : undefined,
        ),
      );
      mark(room.id, proposedStart, checkOut);
      cursor = checkOut;
    }
  }

  return reservations.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.roomId.localeCompare(b.roomId));
}

export const reservations: Reservation[] = buildReservations(TODAY);

export function isStayActiveOn(reservation: Reservation, day: Date): boolean {
  if (reservation.status === "cancelada" || reservation.status === "check-out") {
    return false;
  }
  const start = parseISODate(reservation.checkIn);
  const end = parseISODate(reservation.checkOut);
  return !isBefore(day, start) && isBefore(day, end);
}

export function getDashboardStats(
  day: Date = TODAY,
  all: Reservation[] = reservations,
): DashboardStats {
  const occupiedRoomIds = new Set<string>();
  let checkInsToday = 0;
  let checkOutsToday = 0;

  for (const reservation of all) {
    if (reservation.status === "cancelada") continue;
    const checkIn = parseISODate(reservation.checkIn);
    const checkOut = parseISODate(reservation.checkOut);
    if (isSameDay(checkIn, day)) checkInsToday += 1;
    if (isSameDay(checkOut, day)) checkOutsToday += 1;
    if (isStayActiveOn(reservation, day)) occupiedRoomIds.add(reservation.roomId);
  }

  const monthStart = startOfMonth(day);
  const monthEnd = addDays(endOfMonth(day), 1);
  const tomorrow = addDays(day, 1);
  let forecastRevenue = 0;
  let receivedRevenue = 0;

  for (const reservation of all) {
    if (reservation.status === "cancelada") continue;
    const checkIn = parseISODate(reservation.checkIn);
    const checkOut = parseISODate(reservation.checkOut);
    const nights = stayNights(reservation.checkIn, reservation.checkOut);
    const rate = nights > 0 ? reservation.totalAmount / nights : 0;
    forecastRevenue += rate * overlapNights(checkIn, checkOut, monthStart, monthEnd);
    receivedRevenue += rate * overlapNights(checkIn, checkOut, monthStart, tomorrow);
  }

  const occupied = occupiedRoomIds.size;
  const totalRooms = rooms.length;
  return {
    occupied,
    vacant: totalRooms - occupied,
    checkInsToday,
    checkOutsToday,
    forecastRevenue: Math.round(forecastRevenue),
    receivedRevenue: Math.round(receivedRevenue),
    occupancyToday: Math.round((occupied / totalRooms) * 100),
    totalRooms,
  };
}

export function getMonthlyMetrics(
  year: number = CURRENT_YEAR,
  all: Reservation[] = reservations,
): MonthlyMetric[] {
  return MONTH_LABELS.map((month, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = addMonths(start, 1);
    const daysInMonth = differenceInCalendarDays(end, start);
    const capacity = rooms.length * daysInMonth;
    let occupiedNights = 0;
    let revenue = 0;

    for (const reservation of all) {
      if (reservation.status === "cancelada") continue;
      const checkIn = parseISODate(reservation.checkIn);
      const checkOut = parseISODate(reservation.checkOut);
      const overlap = overlapNights(checkIn, checkOut, start, end);
      if (overlap <= 0) continue;
      occupiedNights += overlap;
      const nights = stayNights(reservation.checkIn, reservation.checkOut);
      revenue += nights > 0 ? (reservation.totalAmount * overlap) / nights : 0;
    }

    return {
      month,
      monthIndex,
      revenue: Math.round(revenue),
      occupancy: capacity > 0 ? Math.round((occupiedNights / capacity) * 1000) / 10 : 0,
    };
  });
}

export function getReservationsOverlapping(
  start: Date,
  end: Date,
  all: Reservation[] = reservations,
): Reservation[] {
  return all.filter((reservation) => {
    const checkIn = parseISODate(reservation.checkIn);
    const checkOut = parseISODate(reservation.checkOut);
    return rangesOverlap(checkIn, checkOut, start, end);
  });
}

export const dashboardStats = getDashboardStats(TODAY);
export const monthlyMetrics = getMonthlyMetrics(CURRENT_YEAR);
