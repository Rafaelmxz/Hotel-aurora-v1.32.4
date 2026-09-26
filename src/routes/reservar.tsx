import { createFileRoute } from "@tanstack/react-router";
import { PublicShowcaseView } from "@/features/direct-booking/PublicShowcaseView";

export const Route = createFileRoute("/reservar")({
  component: PublicShowcaseView,
});
