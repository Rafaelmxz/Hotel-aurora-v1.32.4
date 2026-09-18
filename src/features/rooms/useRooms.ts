import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HousekeepingStatus } from "@/mocks/hotelData";
import {
  listRooms,
  markRoomDirty,
  patchRoomHousekeeping,
  roomKeys,
  type RoomState,
} from "./roomStore";
import { ensureVaultRestored, persistVault } from "@/lib/hotel/hydrate";

export function useRooms() {
  return useQuery({
    queryKey: roomKeys.all,
    queryFn: async () => {
      await ensureVaultRestored();
      return listRooms();
    },
    placeholderData: () => listRooms(),
  });
}

export function usePatchHousekeeping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      housekeepingStatus,
      note,
    }: {
      id: string;
      housekeepingStatus: HousekeepingStatus;
      note?: string;
    }) => patchRoomHousekeeping(id, housekeepingStatus, { note }),
    onSuccess: async (room) => {
      await persistVault();
      queryClient.setQueryData<RoomState[]>(roomKeys.all, (current) =>
        (current ?? listRooms()).map((row) => (row.id === room.id ? room : row)),
      );
      await queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
  });
}

export function useMarkRoomDirty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => markRoomDirty(id),
    onSuccess: async () => {
      await persistVault();
      await queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
  });
}