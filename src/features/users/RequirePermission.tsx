import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useCan, useCanPath, useStaffSession } from "./useStaff";
import type { Permission } from "./roles";
import { homeForRole, ROLE_LABEL } from "./roles";

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const allowed = useCan(permission);
  if (!allowed) return <AccessDenied />;
  return <>{children}</>;
}

export function RequirePath({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const allowed = useCanPath(pathname);
  if (!allowed) return <AccessDenied />;
  return <>{children}</>;
}

export function AccessDenied() {
  const { data: session } = useStaffSession();
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-card p-6 text-center shadow-[var(--shadow-border)]">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Acesso negado
      </p>
      <h1 className="font-display mt-2 text-2xl font-medium tracking-tight">Sem permissão</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {session.name} está como {ROLE_LABEL[session.role]} e não pode abrir esta tela.
      </p>
      <Link to={homeForRole(session.role)} className="mt-4 inline-block text-sm underline">
        Ir para a tela permitida
      </Link>
    </div>
  );
}
