import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RoomType } from "@/mocks/hotelData";
import { reservationKeys, repriceOpenReservations } from "@/features/reservations/reservationStore";
import { folioKeys } from "@/features/reservations/folioStore";
import {
  addPackage,
  addPromo,
  addSeason,
  listCategoryRates,
  listPackages,
  listPromos,
  listSeasons,
  patchCategoryRate,
  rateKeys,
  removePackage,
  removePromo,
  removeSeason,
  type CategoryRate,
  type PromoCode,
  type Season,
  type SpecialPackage,
} from "./rateStore";
import { persistVault } from "@/lib/hotel/hydrate";

export function useCategoryRates() {
  return useQuery({
    queryKey: rateKeys.all,
    queryFn: async () => listCategoryRates(),
    initialData: () => listCategoryRates(),
  });
}

export function useSeasons() {
  return useQuery({
    queryKey: rateKeys.seasons,
    queryFn: async () => listSeasons(),
    initialData: () => listSeasons(),
  });
}

export function usePackages() {
  return useQuery({
    queryKey: rateKeys.packages,
    queryFn: async () => listPackages(),
    initialData: () => listPackages(),
  });
}

export function usePromos() {
  return useQuery({
    queryKey: rateKeys.promos,
    queryFn: async () => listPromos(),
    initialData: () => listPromos(),
  });
}

async function syncReservations(queryClient: ReturnType<typeof useQueryClient>) {
  repriceOpenReservations();
  await persistVault();
  await queryClient.invalidateQueries({ queryKey: reservationKeys.all });
  await queryClient.invalidateQueries({ queryKey: folioKeys.all });
}

export function usePatchCategoryRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      type: RoomType;
    } & Partial<Pick<CategoryRate, "weekday" | "weekend" | "weekdayRate" | "weekendRate">>) =>
      patchCategoryRate(input.type, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.all });
      await syncReservations(queryClient);
    },
  });
}

export function useAddSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Season, "id">) => addSeason(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.seasons });
      await syncReservations(queryClient);
    },
  });
}

export function useRemoveSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => removeSeason(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.seasons });
      await syncReservations(queryClient);
    },
  });
}

export function useAddPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SpecialPackage, "id">) => addPackage(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.packages });
      await syncReservations(queryClient);
    },
  });
}

export function useRemovePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      removePackage(id);
      await persistVault();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.packages });
    },
  });
}

export function useAddPromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<PromoCode, "id" | "usageCount">) => {
      const promo = addPromo(input);
      await persistVault();
      return promo;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.promos });
    },
  });
}

export function useRemovePromo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      removePromo(id);
      await persistVault();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rateKeys.promos });
    },
  });
}
