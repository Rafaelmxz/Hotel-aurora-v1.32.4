import { useState } from "react";
import { toast } from "sonner";
import { isPrivilegeElevation } from "./roles";
import { PinChallengeModal } from "./PinChallengeModal";
import { PinError, type StaffUser } from "./userStore";
import { useStaff, useStaffSession, useSwitchStaff } from "./useStaff";

export function StaffSwitcher() {
  const { data: session } = useStaffSession();
  const { data: staff = [] } = useStaff();
  const switchStaff = useSwitchStaff();
  const [target, setTarget] = useState<StaffUser | null>(null);
  const [error, setError] = useState("");

  const active = staff.filter((user) => user.status === "ativo");

  async function apply(id: string, pin?: string) {
    try {
      const next = await switchStaff.mutateAsync({ id, pin });
      setTarget(null);
      setError("");
      toast.success(`Sessão: ${next.name}`);
    } catch (err) {
      const message = err instanceof PinError ? err.message : "Não foi possível trocar o usuário.";
      setError(message);
      toast.error(message);
    }
  }

  function requestSwitch(id: string) {
    if (id === session.id) return;
    const user = active.find((row) => row.id === id);
    if (!user) return;
    if (isPrivilegeElevation(session.role, user.role)) {
      setError("");
      setTarget(user);
      return;
    }
    void apply(id);
  }

  return (
    <>
      <select
        aria-label="Usuário da sessão"
        className="hidden h-10 max-w-[11rem] truncate rounded-full border border-input bg-card px-3 text-xs sm:block"
        value={session.id}
        onChange={(event) => requestSwitch(event.target.value)}
      >
        {active.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <PinChallengeModal
        open={Boolean(target)}
        user={target}
        error={error}
        pending={switchStaff.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setError("");
          }
        }}
        onConfirm={(pin) => {
          if (target) void apply(target.id, pin);
        }}
      />
    </>
  );
}
