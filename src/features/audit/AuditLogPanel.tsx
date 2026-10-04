/**
 * Lista o diário operacional no final de Equipe.
 * Pode: mostrar data/hora, quem, ação, alvo e detalhe; mais recente primeiro.
 * Proibido: editar ou apagar evento; tarifas; filtro; paginação.
 * Store: auditStore via useAudit. Gravação continua nos hooks de reserva/equipe/caixa.
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ROLE_LABEL, type StaffRole } from "@/features/users/roles";
import { useAudit } from "./useAudit";
import type { AuditAction } from "./auditStore";

const ACTION_LABEL: Record<AuditAction, string> = {
  "reserva.criar": "Criou reserva",
  "reserva.confirmar": "Confirmou reserva",
  "reserva.check-in": "Check-in",
  "reserva.check-out": "Check-out",
  "equipe.cargo": "Alterou cargo",
  "equipe.pin": "PIN",
  "equipe.elevar": "Elevou acesso",
  "caixa.fechar": "Encerrou caixa",
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

function formatRole(role: string) {
  return role in ROLE_LABEL ? ROLE_LABEL[role as StaffRole] : role;
}

export function AuditLogPanel() {
  const { data: events = [] } = useAudit();
  const rows = [...events].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));

  return (
    <section className="grid gap-3">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Diário</p>
        <h2 className="font-display text-2xl font-medium tracking-tight">Quem mexeu</h2>
        <p className="text-sm text-muted-foreground">Registro operacional desta recepção.</p>
      </header>

      <div className="overflow-x-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Data/hora</th>
              <th className="px-4 py-3 font-medium">Quem</th>
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Alvo</th>
              <th className="px-4 py-3 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum evento no diário ainda.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">{formatWhen(row.at)}</td>
                  <td className="px-4 py-3">
                    {row.staffName}
                    <span className="block text-xs text-muted-foreground">{formatRole(row.role)}</span>
                  </td>
                  <td className="px-4 py-3">{ACTION_LABEL[row.action] ?? row.action}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs" title={row.target}>
                    {row.target}
                  </td>
                  <td className="px-4 py-3">{row.detail ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
