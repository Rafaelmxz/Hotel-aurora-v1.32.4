import {
  formatCurrency,
  type HousekeepingStatus,
  type Reservation,
} from "@/mocks/hotelData";
import type { ConsumoItem, PagamentoItem } from "@/features/reservations/types/folio";
import {
  assertNoOverbooking,
  findConflicts,
  findOverbookedIds,
  isActiveStay,
} from "@/features/reservations/overbooking";
import { blocksCheckIn, HOUSEKEEPING_LABEL } from "@/features/rooms/housekeeping";
import type { HotelVault } from "./types";

export class HotelRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "PERIOD"
      | "OVERBOOKING"
      | "CHECKIN_HOUSEKEEPING"
      | "CHECKOUT_BALANCE"
      | "CHECKOUT_DIRTY",
  ) {
    super(message);
    this.name = "HotelRuleError";
  }
}

export function staySaldo(
  reservation: Reservation,
  consumos: ConsumoItem[],
  pagamentos: PagamentoItem[],
) {
  const consumo = consumos
    .filter((row) => row.reserva_id === reservation.id)
    .reduce((sum, row) => sum + row.valor * row.quantidade, 0);
  const pagos = pagamentos
    .filter((row) => row.reserva_id === reservation.id)
    .reduce((sum, row) => sum + row.valor, 0);
  return reservation.totalAmount + consumo - pagos;
}

export function assertValidPeriod(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw new HotelRuleError(
      "Informe um período válido de check-in e check-out.",
      "PERIOD",
    );
  }
}

export function assertNoOverbookingSnapshot(
  reservations: Reservation[],
  previous?: Reservation[],
) {
  const ids = findOverbookedIds(reservations);
  if (ids.size === 0) return;
  if (previous) {
    const prevIds = findOverbookedIds(previous);
    const introduced = [...ids].some((id) => !prevIds.has(id));
    if (!introduced) return;
  }
  throw new HotelRuleError(
    "Não é possível ocupar o mesmo quarto nas mesmas noites.",
    "OVERBOOKING",
  );
}

/** Pendências do site que não batem com o que a recepção já gravou são descartadas. */
export function appendWithoutOverbooking(
  base: Reservation[],
  extras: Reservation[],
): Reservation[] {
  const out = [...base];
  const ids = new Set(base.map((row) => row.id));
  for (const extra of extras) {
    if (ids.has(extra.id)) continue;
    if (
      isActiveStay(extra) &&
      findConflicts(out, extra.roomId, extra.checkIn, extra.checkOut, extra.id).length > 0
    ) {
      continue;
    }
    out.push(extra);
    ids.add(extra.id);
  }
  return out;
}

export function assertStayTransition(input: {
  previous: Reservation;
  next: Reservation;
  reservations: Reservation[];
  rooms: Array<{ id: string; number: string; housekeepingStatus: HousekeepingStatus }>;
  saldo: number;
}) {
  assertValidPeriod(input.next.checkIn, input.next.checkOut);
  if (isActiveStay(input.next)) {
    assertNoOverbooking(input.reservations, {
      roomId: input.next.roomId,
      checkIn: input.next.checkIn,
      checkOut: input.next.checkOut,
      id: input.next.id,
    });
  }

  const becameCheckIn =
    input.next.status === "check-in" && input.previous.status !== "check-in";
  const becameCheckOut =
    input.next.status === "check-out" && input.previous.status !== "check-out";

  if (becameCheckIn) {
    const room = input.rooms.find((row) => row.id === input.next.roomId);
    if (room && blocksCheckIn(room.housekeepingStatus)) {
      throw new HotelRuleError(
        `Quarto ${room.number} está ${HOUSEKEEPING_LABEL[room.housekeepingStatus]}. Libere na governança antes do check-in.`,
        "CHECKIN_HOUSEKEEPING",
      );
    }
  }

  if (becameCheckOut) {
    const saldo = Math.round(input.saldo);
    if (saldo > 0) {
      throw new HotelRuleError(
        `Saldo pendente de ${formatCurrency(saldo)}. Quite a conta para concluir.`,
        "CHECKOUT_BALANCE",
      );
    }
  }
}

export function assertVaultTransition(previous: HotelVault | null, next: HotelVault) {
  for (const row of next.reservations) {
    assertValidPeriod(row.checkIn, row.checkOut);
  }
  if (!previous) return;

  assertNoOverbookingSnapshot(next.reservations, previous.reservations);

  const prevById = new Map(previous.reservations.map((row) => [row.id, row]));
  const roomsById = new Map(next.rooms.map((row) => [row.id, row]));

  for (const row of next.reservations) {
    const before = prevById.get(row.id);
    if (!before) continue;
    const becameCheckIn = row.status === "check-in" && before.status !== "check-in";
    const becameCheckOut = row.status === "check-out" && before.status !== "check-out";
    if (becameCheckIn) {
      const room = roomsById.get(row.roomId);
      if (room && blocksCheckIn(room.housekeepingStatus)) {
        throw new HotelRuleError(
          `Quarto ${room.number} está ${HOUSEKEEPING_LABEL[room.housekeepingStatus]}. Libere na governança antes do check-in.`,
          "CHECKIN_HOUSEKEEPING",
        );
      }
    }
    if (becameCheckOut) {
      const saldo = Math.round(staySaldo(row, next.consumos ?? [], next.pagamentos ?? []));
      if (saldo > 0) {
        throw new HotelRuleError(
          `Saldo pendente de ${formatCurrency(saldo)}. Quite a conta para concluir.`,
          "CHECKOUT_BALANCE",
        );
      }
      const room = roomsById.get(row.roomId);
      if (room && room.housekeepingStatus !== "sujo" && room.housekeepingStatus !== "manutencao") {
        throw new HotelRuleError(
          `Check-out deve deixar o quarto ${room.number} sujo.`,
          "CHECKOUT_DIRTY",
        );
      }
    }
  }
}
