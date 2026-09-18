import { createFileRoute } from "@tanstack/react-router";
import { LoginView } from "@/features/users/LoginView";

export const Route = createFileRoute("/login")({ component: LoginView });
