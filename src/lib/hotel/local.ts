import type { HotelVault } from "./types";

const KEY = "aurora-hotel-vault-v1";

export function readLocalVault(): HotelVault | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HotelVault;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.reservations)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalVault(vault: HotelVault) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(vault));
}
