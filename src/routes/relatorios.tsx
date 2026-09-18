import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "@/features/reports/ReportsView";

export const Route = createFileRoute("/relatorios")({
  component: ReportsView,
});
