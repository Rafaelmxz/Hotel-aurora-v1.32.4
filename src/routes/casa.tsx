import { createFileRoute } from "@tanstack/react-router";
import { HouseMapView } from "@/features/rooms/HouseMapView";

export const Route = createFileRoute("/casa")({
  component: HouseMapView,
});
