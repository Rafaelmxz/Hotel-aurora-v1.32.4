import { useQuery } from "@tanstack/react-query";
import { listAudit } from "./auditStore";

export const auditKeys = {
  all: ["audit"] as const,
};

export function useAudit() {
  return useQuery({
    queryKey: auditKeys.all,
    queryFn: async () => listAudit(),
    initialData: () => listAudit(),
    staleTime: 0,
    refetchOnMount: "always",
  });
}
