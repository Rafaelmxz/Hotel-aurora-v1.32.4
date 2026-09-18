import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { persistVault } from "@/lib/hotel/hydrate";
import {
  bookingKeys,
  getBookingConfig,
  saveBookingConfig,
  type BookingEngineConfig,
} from "./bookingStore";

export function useBookingConfig() {
  return useQuery({
    queryKey: bookingKeys.config,
    queryFn: async () => getBookingConfig(),
    initialData: () => getBookingConfig(),
  });
}

export function useSaveBookingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (next: BookingEngineConfig) => {
      const saved = saveBookingConfig(next);
      await persistVault();
      return saved;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookingKeys.config });
    },
  });
}
