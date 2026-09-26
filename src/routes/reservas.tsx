import { createFileRoute } from "@tanstack/react-router";
import { BookingListView } from "@/features/reservations/BookingListView";

export const Route = createFileRoute("/reservas")({
  component: BookingListView,
});
