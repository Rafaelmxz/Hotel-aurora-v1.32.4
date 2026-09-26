import { useQuery } from "@tanstack/react-query";
import { getGuest, getGuestStats, guestKeys, listGuests, searchGuests } from "./guestStore";

export function useGuests() {
  return useQuery({
    queryKey: guestKeys.all,
    queryFn: async () => listGuests(),
    initialData: () => listGuests(),
  });
}

export function useGuestSearch(query: string) {
  return useQuery({
    queryKey: [...guestKeys.all, "search", query],
    queryFn: async () => searchGuests(query),
    initialData: () => searchGuests(query),
  });
}

export function useGuestProfile(id: string) {
  return useQuery({
    queryKey: guestKeys.byId(id),
    queryFn: async () => {
      const guest = getGuest(id);
      return guest ? getGuestStats(guest) : null;
    },
    initialData: () => {
      const guest = getGuest(id);
      return guest ? getGuestStats(guest) : null;
    },
  });
}
