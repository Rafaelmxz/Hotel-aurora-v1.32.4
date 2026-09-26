import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingKeys, getBookingConfig } from "@/features/direct-booking/bookingStore";
import { persistVault } from "@/lib/hotel/hydrate";
import {
  getProperty,
  propertyKeys,
  saveProperty,
  type PropertyProfile,
} from "./propertyStore";

export function useProperty() {
  return useQuery({
    queryKey: propertyKeys.current,
    queryFn: async () => getProperty(),
    initialData: () => getProperty(),
  });
}

export function useSaveProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (next: PropertyProfile) => {
      const saved = saveProperty(next);
      await persistVault();
      return saved;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(propertyKeys.current, saved);
      queryClient.setQueryData(bookingKeys.config, getBookingConfig());
      await queryClient.invalidateQueries({ queryKey: propertyKeys.current });
      await queryClient.invalidateQueries({ queryKey: bookingKeys.config });
    },
  });
}
