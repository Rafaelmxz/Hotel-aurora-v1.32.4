import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addConsumo, addPagamento, folioKeys, getFolio, removeConsumo, removePagamento } from "./folioStore";
import {
  createReservation,
  listReservations,
  patchReservation,
  replaceReservations,
  reservationKeys,
  type ReservationPatch,
} from "./reservationStore";
import { listRooms, markRoomDirty, roomKeys } from "@/features/rooms/roomStore";
import { guestKeys } from "@/features/guests/guestStore";
import type { Reservation, ReservationStatus } from "@/mocks/hotelData";
import { ensureVaultRestored, persistVault, restoreVault, detectVaultMode } from "@/lib/hotel/hydrate";
import { assertStayTransition } from "@/lib/hotel/rules";
import { actorFromStaff, appendAudit, type AuditAction } from "@/features/audit/auditStore";
import { getSessionUser } from "@/features/users/userStore";
import { listBlocks } from "./blockStore";
import { listSaleCloses } from "./saleCloseStore";

function auditStayStatus(from: ReservationStatus, to: ReservationStatus): AuditAction | null {
  if (from === to) return null;
  if (to === "confirmada") return "reserva.confirmar";
  if (to === "check-in") return "reserva.check-in";
  if (to === "check-out") return "reserva.check-out";
  return null;
}

export function useReservations() {
  return useQuery({
    queryKey: reservationKeys.all,
    queryFn: async () => {
      await ensureVaultRestored();
      if (detectVaultMode() === "staff") {
        await restoreVault();
      }
      return listReservations();
    },
    placeholderData: () => listReservations(),
    staleTime: 4_000,
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      typeof window !== "undefined" && detectVaultMode() === "staff" ? 10_000 : false,
  });
}

export async function syncReservationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updated?: Reservation,
) {
  await persistVault();
  if (updated) {
    queryClient.setQueryData<Reservation[]>(reservationKeys.all, (current) => {
      const list = current ?? listReservations();
      return list.map((row) => (row.id === updated.id ? updated : row));
    });
  } else {
    queryClient.setQueryData<Reservation[]>(reservationKeys.all, listReservations());
  }
  await queryClient.invalidateQueries({ queryKey: reservationKeys.all });
  await queryClient.refetchQueries({ queryKey: reservationKeys.all });
  await queryClient.invalidateQueries({ queryKey: folioKeys.all });
  await queryClient.invalidateQueries({ queryKey: roomKeys.all });
}

export function usePatchReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: ReservationPatch & { id: string }) => {
      const current = listReservations().find((row) => row.id === id);
      if (!current) throw new Error("Reserva não encontrada");
      const next: Reservation = { ...current, ...patch };
      assertStayTransition({
        previous: current,
        next,
        reservations: listReservations(),
        rooms: listRooms(),
        saldo: getFolio(id).totais.saldo,
        blocks: listBlocks(),
        saleCloses: listSaleCloses(),
      });
      const updated = patchReservation(id, patch);
      if (current.status !== "check-out" && updated.status === "check-out") {
        markRoomDirty(updated.roomId);
      }
      const action = auditStayStatus(current.status, updated.status);
      if (action) {
        appendAudit({
          ...actorFromStaff(getSessionUser()),
          action,
          target: updated.id,
          detail: updated.guestName,
        });
      }
      return updated;
    },
    onSuccess: async (updated) => {
      await syncReservationQueries(queryClient, updated);
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roomId: string;
      guestName: string;
      guestEmail: string;
      checkIn: string;
      checkOut: string;
      notes?: string;
      status?: ReservationStatus;
      origin?: string;
      allowOverbooking?: boolean;
      guests?: number;
      adults?: number;
      children?: number;
      guestPhone?: string;
      holdUntil?: string;
    }) => {
      const created = createReservation(input);
      appendAudit({
        ...actorFromStaff(getSessionUser()),
        action: "reserva.criar",
        target: created.id,
        detail: created.guestName,
      });
      return created;
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: guestKeys.all });
      await syncReservationQueries(queryClient, created);
    },
  });
}

export function useCreatePublicReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roomId: string;
      guestName: string;
      guestEmail: string;
      checkIn: string;
      checkOut: string;
      notes?: string;
      guests?: number;
      adults?: number;
      children?: number;
      payMode?: "pix" | "checkin";
      extras?: Array<{
        id: string;
        name: string;
        unitPrice: number;
        quantity: number;
      }>;
      deposit?: {
        valor: number;
        comprovante?: string;
      };
    }) => {
      const autoConfirm =
        input.payMode === "pix" && Boolean(input.deposit && input.deposit.valor > 0);
      const created = createReservation({
        roomId: input.roomId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        notes: input.notes,
        guests: input.guests,
        adults: input.adults,
        children: input.children,
        status: autoConfirm ? "confirmada" : "pendente",
        origin: "Link público",
        pix: input.payMode === "pix",
      });
      const extraItems = (input.extras ?? [])
        .filter((line) => line.quantity > 0 && line.unitPrice >= 0)
        .map((line) =>
          addConsumo({
            id: `csm-extra-${line.id}-${created.id}`,
            reserva_id: created.id,
            descricao: line.name,
            valor: line.unitPrice,
            quantidade: line.quantity,
          }),
        );
      const deposit = autoConfirm && input.deposit
        ? addPagamento({
            id: `pag-sinal-${created.id}`,
            reserva_id: created.id,
            valor: input.deposit.valor,
            metodo: "pix",
            descricao: "Sinal Pix da reserva",
            observacao: input.deposit.comprovante
              ? `Comprovante: ${input.deposit.comprovante}`
              : undefined,
          })
        : undefined;
      try {
        const { submitPublicBookingFn } = await import("@/lib/hotel/api");
        await submitPublicBookingFn({
          data: {
            id: created.id,
            roomId: created.roomId,
            guestName: created.guestName,
            guestEmail: created.guestEmail,
            checkIn: created.checkIn,
            checkOut: created.checkOut,
            guests: created.guests,
            nightlyRate: created.nightlyRate,
            totalAmount: created.totalAmount,
            notes: created.notes,
            status: created.status === "confirmada" ? "confirmada" : "pendente",
            extras: (input.extras ?? []).map((line) => ({
              id: line.id,
              descricao: line.name,
              valor: line.unitPrice,
              quantidade: line.quantity,
            })),
            deposit: deposit
              ? {
                  id: deposit.id,
                  valor: deposit.valor,
                  metodo: deposit.metodo,
                  descricao: deposit.descricao,
                  observacao: deposit.observacao,
                  data_pagamento: deposit.data_pagamento,
                }
              : undefined,
          },
        });
        return created;
      } catch (error) {
        replaceReservations(listReservations().filter((row) => row.id !== created.id));
        if (deposit) removePagamento(deposit.id);
        for (const item of extraItems) removeConsumo(item.id);
        throw error;
      }
    },
    onSuccess: async (created) => {
      queryClient.setQueryData<Reservation[]>(reservationKeys.all, (current) => {
        const list = current ?? listReservations();
        return list.some((row) => row.id === created.id) ? list : [...list, created];
      });
      await queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      await queryClient.invalidateQueries({ queryKey: folioKeys.all });
    },
  });
}
