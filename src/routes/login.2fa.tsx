import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorChallengeView } from "@/features/users/TwoFactorChallengeView";

export const Route = createFileRoute("/login/2fa")({
  component: TwoFactorChallengeView,
});
