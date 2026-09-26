import { createFileRoute } from "@tanstack/react-router";
import { OccupancyView } from "@/features/reservations/OccupancyView";

export const Route = createFileRoute("/ocupacao")({
  component: OccupancyView,
});
