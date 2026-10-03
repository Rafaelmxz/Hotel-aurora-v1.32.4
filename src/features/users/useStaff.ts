import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { can, canAccessPath, isPrivilegeElevation, ROLE_LABEL, type Permission } from "./roles";
import {
  getSessionUser,
  inviteStaff,
  listStaff,
  patchStaff,
  removeStaff,
  setSessionUser,
  staffKeys,
  type StaffUser,
} from "./userStore";
import { persistVault } from "@/lib/hotel/hydrate";
import { actorFromStaff, appendAudit } from "@/features/audit/auditStore";

export function useStaff() {
  return useQuery({
    queryKey: staffKeys.all,
    queryFn: async () => listStaff(),
    initialData: () => listStaff(),
  });
}

export function useStaffSession() {
  return useQuery({
    queryKey: staffKeys.session,
    queryFn: async () => getSessionUser(),
    initialData: () => getSessionUser(),
  });
}

export function useCan(permission: Permission) {
  const { data: session } = useStaffSession();
  return can(session.role, permission);
}

export function useCanPath(pathname: string) {
  const { data: session } = useStaffSession();
  return canAccessPath(session.role, pathname);
}

export function useSwitchStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; pin?: string }) => {
      const before = getSessionUser();
      const next = setSessionUser(input.id, input.pin);
      if (before.id !== next.id && isPrivilegeElevation(before.role, next.role)) {
        await persistVault();
      }
      return next;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.session });
    },
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; role: import("./roles").StaffRole }) => {
      const user = inviteStaff(input);
      await persistVault();
      return user;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function usePatchStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<Pick<StaffUser, "name" | "email" | "role" | "status" | "pin">> & { id: string }) => {
      const actor = actorFromStaff(getSessionUser());
      const user = patchStaff(id, patch);
      if (patch.role) {
        appendAudit({
          ...actor,
          action: "equipe.cargo",
          target: id,
          detail: `${user.name} · ${ROLE_LABEL[user.role]}`,
        });
      }
      if (patch.pin !== undefined) {
        appendAudit({
          ...actor,
          action: "equipe.pin",
          target: id,
          detail: patch.pin === "" ? `${user.name} · PIN removido` : `${user.name} · PIN definido`,
        });
      }
      await persistVault();
      return user;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.all });
      await queryClient.invalidateQueries({ queryKey: staffKeys.session });
    },
  });
}

export function useRemoveStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      removeStaff(id);
      await persistVault();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.all });
      await queryClient.invalidateQueries({ queryKey: staffKeys.session });
    },
  });
}
