import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { persistVault, ensureVaultRestored } from "@/lib/hotel/hydrate";
import type { RoomType } from "@/mocks/hotelData";
import { reservationKeys } from "./reservationStore";
import {
  createSaleClose,
  listSaleCloses,
  removeSaleClose,
  saleCloseKeys,
  type SaleClose,
} from "./saleCloseStore";

export function useSaleCloses() {
  return useQuery({
    queryKey: saleCloseKeys.all,
    queryFn: async () => {
      await ensureVaultRestored();
      return listSaleCloses();
    },
    placeholderData: () => listSaleCloses(),
  });
}

async function syncCloses(queryClient: ReturnType<typeof useQueryClient>) {
  await persistVault();
  queryClient.setQueryData<SaleClose[]>(saleCloseKeys.all, listSaleCloses());
  await queryClient.invalidateQueries({ queryKey: saleCloseKeys.all });
  await queryClient.invalidateQueries({ queryKey: reservationKeys.all });
}

export function useCreateSaleClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roomType: RoomType | "todas";
      checkIn: string;
      checkOut: string;
      reason: string;
    }) => createSaleClose(input),
    onSuccess: async () => {
      await syncCloses(queryClient);
    },
  });
}

export function useRemoveSaleClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      removeSaleClose(id);
    },
    onSuccess: async () => {
      await syncCloses(queryClient);
    },
  });
}
