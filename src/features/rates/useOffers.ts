import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addOffer,
  listOffers,
  offerKeys,
  patchOffer,
  removeOffer,
  type Offer,
} from "./offerStore";
import { persistVault } from "@/lib/hotel/hydrate";

export function useOffers() {
  return useQuery({
    queryKey: offerKeys.all,
    queryFn: async () => listOffers(),
    initialData: () => listOffers(),
  });
}

export function useAddOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Offer, "id" | "percent">) => {
      const offer = addOffer(input);
      await persistVault();
      return offer;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}

export function usePatchOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Omit<Offer, "id">> & { id: string }) => {
      const offer = patchOffer(id, patch);
      await persistVault();
      return offer;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}

export function useRemoveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      removeOffer(id);
      await persistVault();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}
