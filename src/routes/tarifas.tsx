import { createFileRoute } from "@tanstack/react-router";
import { RateManagementView } from "@/features/rates/RateManagementView";

const ABAS = ["tarifas", "pacotes", "cupons", "ofertas"] as const;
type TarifasAba = (typeof ABAS)[number];

export const Route = createFileRoute("/tarifas")({
  validateSearch: (search: Record<string, unknown>): { aba?: TarifasAba } => {
    const aba = search.aba;
    if (typeof aba === "string" && (ABAS as readonly string[]).includes(aba)) {
      return { aba: aba as TarifasAba };
    }
    return {};
  },
  component: RateManagementView,
});
