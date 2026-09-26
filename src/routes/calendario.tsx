import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/features/reservations/CalendarPage";

export const Route = createFileRoute("/calendario")({
  validateSearch: (search: Record<string, unknown>): { reserva?: string } => ({
    reserva: typeof search.reserva === "string" ? search.reserva : undefined,
  }),
  component: CalendarPage,
});
