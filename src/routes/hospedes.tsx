import { createFileRoute } from "@tanstack/react-router";
import { GuestListView } from "@/features/guests/GuestListView";

export const Route = createFileRoute("/hospedes")({
  component: GuestListView,
});
