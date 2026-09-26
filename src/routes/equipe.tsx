import { createFileRoute } from "@tanstack/react-router";
import { UserManagementView } from "@/features/users/UserManagementView";

export const Route = createFileRoute("/equipe")({
  component: UserManagementView,
});
