import type { HousekeepingStatus } from "@/mocks/hotelData";

export const HOUSEKEEPING_LABEL: Record<HousekeepingStatus, string> = {
  sujo: "Sujo",
  em_limpeza: "Em limpeza",
  limpo: "Limpo",
  manutencao: "Manutenção",
};

export const HOUSEKEEPING_DOT: Record<HousekeepingStatus, string> = {
  sujo: "bg-status-pending",
  em_limpeza: "bg-status-confirmed",
  limpo: "bg-status-checkout",
  manutencao: "bg-status-cancelled",
};

export const HOUSEKEEPING_ORDER: HousekeepingStatus[] = [
  "sujo",
  "em_limpeza",
  "limpo",
  "manutencao",
];

export const HOUSEKEEPING_BLOCKS_CHECKIN: HousekeepingStatus[] = [
  "sujo",
  "em_limpeza",
  "manutencao",
];

export function blocksCheckIn(status: HousekeepingStatus) {
  return HOUSEKEEPING_BLOCKS_CHECKIN.includes(status);
}
