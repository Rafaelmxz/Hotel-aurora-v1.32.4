import { createFileRoute } from "@tanstack/react-router";
import { AccountMfaView } from "@/features/users/AccountMfaView";

export const Route = createFileRoute("/conta")({
  component: AccountMfaView,
});
