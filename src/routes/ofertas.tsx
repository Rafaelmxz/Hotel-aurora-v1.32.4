import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ofertas")({
  beforeLoad: () => {
    throw redirect({ href: "/tarifas?aba=ofertas" });
  },
  component: () => null,
});
