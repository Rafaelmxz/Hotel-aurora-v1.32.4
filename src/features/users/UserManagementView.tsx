import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL, requiresPin, type StaffRole } from "./roles";
import {
  useInviteStaff,
  usePatchStaff,
  useRemoveStaff,
  useStaff,
  useStaffSession,
} from "./useStaff";
import type { StaffStatus } from "./userStore";

const ROLES: StaffRole[] = ["admin", "gerente", "recepcionista", "governanca", "financeiro"];

export function UserManagementView() {
  const { data: users = [] } = useStaff();
  const { data: session } = useStaffSession();
  const invite = useInviteStaff();
  const patch = usePatchStaff();
  const remove = useRemoveStaff();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("recepcionista");

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    try {
      await invite.mutateAsync({ name, email, role });
      toast.success(`Convite enviado · ${name}`);
      setName("");
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível convidar.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Equipe</p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Usuários e permissões</h1>
        <p className="text-sm text-muted-foreground">
          Sessão atual: {session.name} · {ROLE_LABEL[session.role]}. Quem entra com o mesmo
          e-mail assume este cargo, sem PIN.
        </p>
      </header>

      <form
        onSubmit={onInvite}
        className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:grid-cols-4"
      >
        <div className="grid gap-2 sm:col-span-1">
          <Label>Nome</Label>
          <Input required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid gap-2 sm:col-span-1">
          <Label>E-mail</Label>
          <Input
            required
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nome@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Cargo</Label>
          <select
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole)}
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABEL[item]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="self-end" disabled={invite.isPending}>
          Convidar
        </Button>
      </form>

      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        {users.map((user) => (
          <li
            key={user.id}
            className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_12rem_8rem_7rem_auto] sm:items-center"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <select
              className="h-10 rounded-md border border-input bg-card px-2 text-sm"
              value={user.role}
              onChange={(event) =>
                void patch
                  .mutateAsync({ id: user.id, role: event.target.value as StaffRole })
                  .catch((error) =>
                    toast.error(error instanceof Error ? error.message : "Não foi possível alterar o cargo."),
                  )
              }
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABEL[item]}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-card px-2 text-sm"
              value={user.status}
              onChange={(event) =>
                void patch
                  .mutateAsync({
                    id: user.id,
                    status: event.target.value as StaffStatus,
                  })
                  .catch((error) =>
                    toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status."),
                  )
              }
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            {requiresPin(user.role) ? (
              <input
                className="h-10 rounded-md border border-input bg-card px-2 text-sm tabular-nums"
                inputMode="numeric"
                maxLength={4}
                placeholder={user.pin ? "PIN ••••" : "PIN 4 dígitos"}
                onBlur={(event) => {
                  const pin = event.target.value.replace(/\D/g, "").slice(0, 4);
                  if (pin.length !== 4) return;
                  void patch.mutateAsync({ id: user.id, pin }).then(() => {
                    toast.success(`PIN atualizado · ${user.name}`);
                    event.target.value = "";
                  });
                }}
              />
            ) : (
              <span className="self-center text-xs text-muted-foreground">sem PIN</span>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-self-start text-destructive hover:text-destructive sm:justify-self-end"
              disabled={remove.isPending || user.id === session.id}
              onClick={() => {
                if (user.id === session.id) {
                  toast.error("Não é possível excluir quem está na sessão agora.");
                  return;
                }
                if (!window.confirm(`Excluir ${user.name} da equipe?`)) return;
                void remove
                  .mutateAsync(user.id)
                  .then(() => toast.success(`${user.name} foi excluído da equipe.`))
                  .catch((error) =>
                    toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
                  );
              }}
            >
              Excluir
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
