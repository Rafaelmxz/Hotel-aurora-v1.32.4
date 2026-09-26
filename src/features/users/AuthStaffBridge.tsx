import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureVaultRestored, getLastMembershipRole, persistVault } from "@/lib/hotel/hydrate";
import { bindAuthToStaff, staffKeys } from "./userStore";

export function AuthStaffBridge() {
  const { user, isPending } = useCurrentUserState();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isPending || !user) return;
    let cancelled = false;
    void ensureVaultRestored()
      .then(async () => {
        if (cancelled) return;
        const result = bindAuthToStaff({
          authUserId: user.id,
          email: user.primaryEmail,
          name: user.displayName,
          membershipRole: getLastMembershipRole(),
        });
        if (result.created) await persistVault();
        await queryClient.invalidateQueries({ queryKey: staffKeys.all });
        await queryClient.invalidateQueries({ queryKey: staffKeys.session });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, isPending, queryClient]);

  return null;
}
