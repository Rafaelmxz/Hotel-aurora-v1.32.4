import { createFileRoute } from "@tanstack/react-router";
import { HotelSettingsView } from "@/features/settings/HotelSettingsView";

export const Route = createFileRoute("/configuracoes")({
  component: HotelSettingsView,
});
