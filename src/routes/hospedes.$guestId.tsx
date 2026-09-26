import { createFileRoute } from "@tanstack/react-router";
import { GuestProfileView } from "@/features/guests/GuestProfileView";

export const Route = createFileRoute("/hospedes/$guestId")({
  component: GuestProfilePage,
});

function GuestProfilePage() {
  const { guestId } = Route.useParams();
  return <GuestProfileView guestId={guestId} />;
}
