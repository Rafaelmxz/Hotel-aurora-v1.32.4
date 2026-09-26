import {
  formatCurrency,
  type HousekeepingStatus,
  type Reservation,
  type RoomType,
} from "@/mocks/hotelData";
import type { ConsumoItem, PagamentoItem } from "@/features/reservations/types/folio";
import {
  assertNoOverbooking,
  findBlockConflicts,
  findConflicts,
  findOverbookedIds,
  findSaleCloseHits,
  isActiveStay,
} from "@/features/reservations/overbooking";
import type { RoomBlock } from "@/features/reservations/blockStore";
import type { SaleClose } from "@/features/reservations/saleCloseStore";
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
  blocks: RoomBlock[] = [],
  previousBlocks: RoomBlock[] = [],
) {
  const ids = findOverbookedIds(reservations);
  if (ids.size > 0) {
    if (previous) {
      const prevIds = findOverbookedIds(previous);
      const introduced = [...ids].some((id) => !prevIds.has(id));
      if (introduced) {
        throw new HotelRuleError(
          "Não é possível ocupar o mesmo quarto nas mesmas noites.",
          "OVERBOOKING",
        );
      }
    } else {
      throw new HotelRuleError(
        "Não é possível ocupar o mesmo quarto nas mesmas noites.",
        "OVERBOOKING",
      );
    }
  }
  for (const block of blocks) {
    if (findConflicts(reservations, block.roomId, block.checkIn, block.checkOut).length === 0) {
      continue;
    }
    const wasThere = previousBlocks.some((row) => row.id === block.id);
    if (!wasThere) {
      throw new HotelRuleError(
        "Não é possível bloquear um quarto já ocupado nas mesmas noites.",
        "OVERBOOKING",
      );
    }
  }
}

/** Pendências do site que não batem com o que a recepção já gravou são descartadas. */
export function appendWithoutOverbooking(
  base: Reservation[],
  extras: Reservation[],
  blocks: RoomBlock[] = [],
  saleCloses: SaleClose[] = [],
  roomTypeOf?: (roomId: string) => RoomType | undefined,
): Reservation[] {
  const out = [...base];
  const ids = new Set(base.map((row) => row.id));
  for (const extra of extras) {
    if (ids.has(extra.id)) continue;
    if (isActiveStay(extra)) {
      if (findConflicts(out, extra.roomId, extra.checkIn, extra.checkOut, extra.id).length > 0) {
        continue;
      }
      if (findBlockConflicts(blocks, extra.roomId, extra.checkIn, extra.checkOut).length > 0) {
        continue;
      }
      const type = roomTypeOf?.(extra.roomId);
      if (type && findSaleCloseHits(saleCloses, type, extra.checkIn, extra.checkOut).length > 0) {
        continue;
      }
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
  blocks?: RoomBlock[];
  saleCloses?: SaleClose[];
}) {
  assertValidPeriod(input.next.checkIn, input.next.checkOut);
  if (isActiveStay(input.next)) {
    assertNoOverbooking(
      input.reservations,
      {
        roomId: input.next.roomId,
        checkIn: input.next.checkIn,
        checkOut: input.next.checkOut,
        id: input.next.id,
      },
      input.blocks ?? [],
      input.saleCloses ?? [],
    );
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
  for (const row of next.blocks ?? []) {
    assertValidPeriod(row.checkIn, row.checkOut);
  }
  if (!previous) return;

  assertNoOverbookingSnapshot(
    next.reservations,
    previous.reservations,
    next.blocks ?? [],
    previous.blocks ?? [],
  );

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
