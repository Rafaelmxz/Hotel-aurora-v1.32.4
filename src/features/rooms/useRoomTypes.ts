import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { persistVault } from "@/lib/hotel/hydrate";
import {
  listRoomTypes,
  roomTypeKeys,
  saveRoomTypes,
  type RoomTypeProfile,
} from "./roomTypeStore";

export function useRoomTypes() {
  return useQuery({
    queryKey: roomTypeKeys.all,
    queryFn: async () => listRoomTypes(),
    initialData: () => listRoomTypes(),
  });
}

export function useSaveRoomTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: RoomTypeProfile[]) => {
      const saved = saveRoomTypes(rows);
      await persistVault();
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(roomTypeKeys.all, saved);
    },
  });
}
