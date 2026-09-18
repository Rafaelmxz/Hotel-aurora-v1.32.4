import type { ReservationStatus } from "@/mocks/hotelData";

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  "check-in": "Em check-in",
  "check-out": "Checked-out",
  cancelada: "Cancelado",
};

export const STATUS_BADGE: Record<
  ReservationStatus,
  "pending" | "confirmed" | "checkin" | "checkout" | "cancelled"
> = {
  pendente: "pending",
  confirmada: "confirmed",
  "check-in": "checkin",
  "check-out": "checkout",
  cancelada: "cancelled",
};

export const STATUS_BAR: Record<ReservationStatus, string> = {
  pendente: "bg-status-pending text-status-pending-fg",
  confirmada: "bg-status-confirmed text-status-confirmed-fg",
  "check-in": "bg-status-checkin text-status-checkin-fg",
  "check-out": "bg-status-checkout text-status-checkout-fg",
  cancelada:
    "bg-muted text-muted-foreground line-through ring-1 ring-inset ring-border",
};
