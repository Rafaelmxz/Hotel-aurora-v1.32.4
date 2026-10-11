import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { LoginView } from "@/features/users/LoginView";

export const Route = createFileRoute("/login")({ component: LoginRoute });

function LoginRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/login") return <Outlet />;
  return <LoginView />;
}
