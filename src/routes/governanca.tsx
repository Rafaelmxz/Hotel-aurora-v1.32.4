import { createFileRoute } from "@tanstack/react-router";
import { HousekeepingView } from "@/features/rooms/HousekeepingView";

export const Route = createFileRoute("/governanca")({
  component: HousekeepingView,
});
