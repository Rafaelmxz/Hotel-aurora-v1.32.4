import { createFileRoute } from "@tanstack/react-router";
import { BookingEngineView } from "@/features/direct-booking/BookingEngineView";

export const Route = createFileRoute("/reservas-diretas")({
  component: BookingEngineView,
});
