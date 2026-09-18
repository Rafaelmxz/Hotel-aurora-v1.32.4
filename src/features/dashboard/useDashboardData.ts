import { useMemo } from "react";
import {
  TODAY_ISO,
  getDashboardStats,
  parseISODate,
  roomById,
  stayNights,
  type Reservation,
} from "@/mocks/hotelData";
import { getFolio, listAllPagamentos } from "@/features/reservations/folioStore";
import { useRooms } from "@/features/rooms/useRooms";
import { useReservations } from "@/features/reservations/useReservations";

export type DayTab = "chegadas" | "saidas" | "permanencias" | "casa";

function isOpen(row: Reservation) {
  return row.status !== "cancelada";
}

function occupiesNight(row: Reservation, iso: string) {
  return isOpen(row) && row.status !== "check-out" && row.checkIn <= iso && row.checkOut > iso;
}

export function useDashboardData(dayIso: string = TODAY_ISO) {
  const { data: reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();

  return useMemo(() => {
    const day = parseISODate(dayIso);
    const stats = getDashboardStats(day, reservations);
    const chegadas = reservations.filter((row) => isOpen(row) && row.checkIn === dayIso);
    const saidas = reservations.filter((row) => isOpen(row) && row.checkOut === dayIso);
    const permanencias = reservations.filter(
      (row) => isOpen(row) && row.checkIn < dayIso && row.checkOut > dayIso,
    );
    const casa = reservations.filter((row) => row.status === "check-in");
    const remainingArrivals = chegadas.filter(
      (row) => row.status === "pendente" || row.status === "confirmada",
    );
    const remainingDepartures = saidas.filter((row) => row.status === "check-in");
    const withBalance = reservations
      .filter((row) => row.status !== "cancelada" && row.status !== "check-out")
      .map((row) => ({ row, saldo: getFolio(row.id).totais.saldo }))
      .filter((item) => item.saldo > 0);

    const byId = new Map(reservations.map((row) => [row.id, row]));
    const salesToday = listAllPagamentos()
      .filter((item) => item.data_pagamento === dayIso)
      .map((item) => {
        const row = byId.get(item.reserva_id);
        return {
          ...item,
          guestName: row?.guestName ?? "—",
          checkIn: row?.checkIn,
          nights: row ? stayNights(row.checkIn, row.checkOut) : 0,
        };
      });
    const salesTotal = salesToday.reduce((sum, item) => sum + item.valor, 0);
    const createdToday = reservations.filter((row) => row.createdAt === dayIso);
    const roomNightsToday = createdToday.reduce(
      (sum, row) => sum + stayNights(row.checkIn, row.checkOut),
      0,
    );
    const cancelamentos = reservations.filter(
      (row) =>
        row.status === "cancelada" &&
        (row.createdAt === dayIso || row.checkIn === dayIso || row.checkOut === dayIso),
    );

    const dirtyArrivals = chegadas.filter((row) => {
      const room = rooms.find((item) => item.id === row.roomId);
      return room?.housekeepingStatus === "sujo" || room?.housekeepingStatus === "manutencao";
    });
    const pendentes = reservations.filter(
      (row) =>
        row.status === "pendente" ||
        (row.origin === "Link público" && row.status === "confirmada"),
    );
    const occupiedTonight = new Set(
      reservations.filter((row) => occupiesNight(row, dayIso)).map((row) => row.roomId),
    ).size;
    const totalRooms = rooms.length || stats.totalRooms;

    return {
      stats,
      chegadas,
      saidas,
      permanencias,
      casa,
      remainingArrivals,
      remainingDepartures,
      occupiedTonight,
      totalRooms,
      occupancyPct:
        totalRooms === 0 ? 0 : Math.round((occupiedTonight / totalRooms) * 100),
      pendentesSaldo: withBalance,
      salesToday,
      salesTotal,
      createdToday,
      roomNightsToday,
      cancelamentos,
      dirtyArrivals,
      preReservas: pendentes,
    };
  }, [reservations, rooms, dayIso]);
}

export function reservationRoomLabel(row: Reservation) {
  const room = roomById(row.roomId);
  return room ? `${room.number} · ${room.type}` : row.roomId;
}

export function reservationCode(row: Reservation) {
  return row.id.replace(/^res-/i, "").toUpperCase();
}
