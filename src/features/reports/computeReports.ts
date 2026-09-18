import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  max as maxDate,
  min as minDate,
  startOfMonth,
  startOfYear,
} from "date-fns";
import {
  parseISODate,
  rooms,
  stayNights,
  type Reservation,
} from "@/mocks/hotelData";
import {
  listAllConsumos,
  listAllPagamentos,
} from "@/features/reservations/folioStore";
import type { MetodoPagamento } from "@/features/reservations/types/folio";

export type ReportMode = "month" | "year";

export type HotelKpis = {
  occupancy: number;
  adr: number;
  revpar: number;
  occupiedNights: number;
  availableNights: number;
  roomRevenue: number;
};

export type DreReport = {
  roomRevenue: number;
  extras: number;
  gross: number;
  byMethod: Record<MetodoPagamento, number>;
  received: number;
};

export type PeriodReport = {
  start: Date;
  end: Date;
  kpis: HotelKpis;
  dre: DreReport;
};

function overlapNights(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = maxDate([aStart, bStart]);
  const end = minDate([aEnd, bEnd]);
  const nights = differenceInCalendarDays(end, start);
  return nights > 0 ? nights : 0;
}

export function periodRange(mode: ReportMode, cursor: Date) {
  if (mode === "year") {
    const start = startOfYear(cursor);
    return { start, end: addYears(start, 1) };
  }
  const start = startOfMonth(cursor);
  return { start, end: addMonths(start, 1) };
}

export function previousRange(mode: ReportMode, cursor: Date) {
  const shifted = mode === "year" ? addYears(cursor, -1) : addMonths(cursor, -1);
  return periodRange(mode, shifted);
}

export function computeKpis(
  reservations: Reservation[],
  start: Date,
  end: Date,
): HotelKpis {
  const days = Math.max(1, differenceInCalendarDays(end, start));
  const availableNights = rooms.length * days;
  let occupiedNights = 0;
  let roomRevenue = 0;

  for (const reservation of reservations) {
    if (reservation.status === "cancelada") continue;
    const checkIn = parseISODate(reservation.checkIn);
    const checkOut = parseISODate(reservation.checkOut);
    const overlap = overlapNights(checkIn, checkOut, start, end);
    if (overlap <= 0) continue;
    occupiedNights += overlap;
    const nights = stayNights(reservation.checkIn, reservation.checkOut);
    roomRevenue += nights > 0 ? (reservation.totalAmount * overlap) / nights : 0;
  }

  const adr = occupiedNights > 0 ? roomRevenue / occupiedNights : 0;
  const occupancy = availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0;
  const revpar = availableNights > 0 ? roomRevenue / availableNights : 0;

  return {
    occupancy,
    adr,
    revpar,
    occupiedNights,
    availableNights,
    roomRevenue,
  };
}

function inRange(iso: string, start: Date, end: Date) {
  const day = parseISODate(iso);
  return day >= start && day < end;
}

export function computeDre(
  reservations: Reservation[],
  start: Date,
  end: Date,
): DreReport {
  const kpis = computeKpis(reservations, start, end);
  const extras = listAllConsumos()
    .filter((item) => inRange(item.data_lancamento, start, end))
    .reduce((sum, item) => sum + item.valor * item.quantidade, 0);

  const byMethod: Record<MetodoPagamento, number> = {
    pix: 0,
    cartao_credito: 0,
    cartao_debito: 0,
    dinheiro: 0,
  };
  let received = 0;
  for (const payment of listAllPagamentos()) {
    if (!inRange(payment.data_pagamento, start, end)) continue;
    byMethod[payment.metodo] += payment.valor;
    received += payment.valor;
  }

  return {
    roomRevenue: kpis.roomRevenue,
    extras,
    gross: kpis.roomRevenue + extras,
    byMethod,
    received,
  };
}

export function buildPeriodReport(
  reservations: Reservation[],
  start: Date,
  end: Date,
): PeriodReport {
  return {
    start,
    end,
    kpis: computeKpis(reservations, start, end),
    dre: computeDre(reservations, start, end),
  };
}

export function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}
