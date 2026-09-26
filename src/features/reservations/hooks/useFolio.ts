import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addConsumo,
  addPagamento,
  folioKeys,
  getFolio,
  removeConsumo,
} from "../folioStore";
import type { FolioResumo, MetodoPagamento } from "../types/folio";
import { ensureVaultRestored, persistVault } from "@/lib/hotel/hydrate";

const EMPTY_FOLIO: FolioResumo = {
  reservaId: "",
  itens: [],
  pagamentos: [],
  linhas: [],
  totais: {
    totalDiarias: 0,
    totalConsumo: 0,
    totalPagamentos: 0,
    saldo: 0,
  },
};

export function useFolio(reservationId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: folioKeys.byReservation(reservationId ?? ""),
    queryFn: async () => {
      await ensureVaultRestored();
      return getFolio(reservationId!);
    },
    enabled: Boolean(reservationId),
    initialData: () => (reservationId ? getFolio(reservationId) : EMPTY_FOLIO),
  });

  const folio = query.data ?? EMPTY_FOLIO;

  async function invalidateFolio() {
    await persistVault();
    if (!reservationId) return;
    await queryClient.invalidateQueries({
      queryKey: folioKeys.byReservation(reservationId),
    });
    await queryClient.invalidateQueries({ queryKey: folioKeys.all });
  }

  const addItem = useMutation({
    mutationFn: async (input: {
      descricao: string;
      valor: number;
      quantidade: number;
    }) => {
      if (!reservationId) throw new Error("Reserva não informada");
      return addConsumo({ reserva_id: reservationId, ...input });
    },
    onSuccess: invalidateFolio,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => removeConsumo(id),
    onSuccess: invalidateFolio,
  });

  const addPayment = useMutation({
    mutationFn: async (input: {
      valor: number;
      metodo: MetodoPagamento;
      observacao?: string;
      descricao?: string;
    }) => {
      if (!reservationId) throw new Error("Reserva não informada");
      return addPagamento({ reserva_id: reservationId, ...input });
    },
    onSuccess: async () => {
      await invalidateFolio();
    },
  });

  return {
    ...query,
    itens: folio.itens,
    pagamentos: folio.pagamentos,
    linhas: folio.linhas,
    totais: folio.totais,
    saldo: folio.totais.saldo,
    addItem,
    removeItem,
    addPayment,
  };
}
