import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TODAY_ISO } from "@/mocks/hotelData";
import { folioKeys, listAllPagamentos } from "@/features/reservations/folioStore";
import {
  cashKeys,
  closeCash,
  getCashClose,
  totalsForDate,
} from "./cashStore";
import { persistVault } from "@/lib/hotel/hydrate";
import { actorFromStaff, appendAudit } from "@/features/audit/auditStore";
import { getSessionUser } from "@/features/users/userStore";

export function useDailyCash(date: string = TODAY_ISO) {
  const payments = useQuery({
    queryKey: [...folioKeys.all, "payments", date],
    queryFn: async () => listAllPagamentos().filter((item) => item.data_pagamento === date),
    initialData: () => listAllPagamentos().filter((item) => item.data_pagamento === date),
  });

  const close = useQuery({
    queryKey: cashKeys.day(date),
    queryFn: async () => getCashClose(date) ?? null,
    initialData: () => getCashClose(date) ?? null,
  });

  return {
    payments: payments.data ?? [],
    totals: totalsForDate(date),
    close: close.data,
    isClosed: close.data?.status === "fechado",
  };
}

export function useCloseCash(date: string = TODAY_ISO) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { countedCash: number; notes?: string }) => {
      const report = closeCash({ ...input, date });
      appendAudit({
        ...actorFromStaff(getSessionUser()),
        action: "caixa.fechar",
        target: report.date,
        detail: report.id,
      });
      await persistVault();
      return report;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cashKeys.all });
      await queryClient.invalidateQueries({ queryKey: cashKeys.day(date) });
      await queryClient.invalidateQueries({ queryKey: folioKeys.all });
    },
  });
}
