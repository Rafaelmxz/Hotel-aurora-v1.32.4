import { createFileRoute } from "@tanstack/react-router";
import { DailyCashRegister } from "@/features/finance/DailyCashRegister";

export const Route = createFileRoute("/caixa")({
  component: DailyCashRegister,
});
