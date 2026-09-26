import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { persistVault, ensureVaultRestored } from "@/lib/hotel/hydrate";
import { listReservations, reservationKeys } from "./reservationStore";
import {
  blockKeys,
  createBlock,
  listBlocks,
  removeBlock,
  type RoomBlock,
} from "./blockStore";

export function useBlocks() {
  return useQuery({
    queryKey: blockKeys.all,
    queryFn: async () => {
      await ensureVaultRestored();
      return listBlocks();
    },
    placeholderData: () => listBlocks(),
  });
}

async function syncBlocks(queryClient: ReturnType<typeof useQueryClient>) {
  await persistVault();
  queryClient.setQueryData<RoomBlock[]>(blockKeys.all, listBlocks());
  await queryClient.invalidateQueries({ queryKey: blockKeys.all });
  await queryClient.invalidateQueries({ queryKey: reservationKeys.all });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roomId: string;
      checkIn: string;
      checkOut: string;
      reason: string;
    }) => createBlock(input, listReservations()),
    onSuccess: async () => {
      await syncBlocks(queryClient);
    },
  });
}

export function useRemoveBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      removeBlock(id);
    },
    onSuccess: async () => {
      await syncBlocks(queryClient);
    },
  });
}
