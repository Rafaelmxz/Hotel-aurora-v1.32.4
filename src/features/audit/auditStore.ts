/**
 * Diário operacional de quem mexeu no hotel (cofre).
 * Pode: gravar criar/confirmar/check-in/checkout, cargo, PIN, elevar, fechar caixa.
 * Proibido: tarifas; guardar o valor do PIN; pretender prova contra DevTools.
 * Store: este arquivo. Entra no cofre via snapshotVault / applyVault.
 */
import type { StaffRole } from "@/features/users/roles";

export const AUDIT_MAX = 500;

export const SITE_AUDIT_ACTOR = {
  staffId: "link-publico",
  staffName: "Link público",
  role: "site",
} as const;

export type AuditAction =
  | "reserva.criar"
  | "reserva.confirmar"
  | "reserva.check-in"
  | "reserva.check-out"
  | "equipe.cargo"
  | "equipe.pin"
  | "equipe.elevar"
  | "caixa.fechar";

export type AuditEvent = {
  id: string;
  at: string;
  staffId: string;
  staffName: string;
  role: string;
  action: AuditAction;
  target: string;
  detail?: string;
};

export type AuditActor = {
  staffId: string;
  staffName: string;
  role: string;
};

let events: AuditEvent[] = [];

function newAuditId() {
  try {
    return `aud-${crypto.randomUUID()}`;
  } catch {
    return `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function capAudit(rows: AuditEvent[]): AuditEvent[] {
  if (rows.length <= AUDIT_MAX) return rows;
  return rows.slice(rows.length - AUDIT_MAX);
}

export function mergeAudit(
  base: AuditEvent[] | undefined | null,
  extras: AuditEvent[] | undefined | null,
): AuditEvent[] {
  const ids = new Set((base ?? []).map((row) => row.id));
  const out = [...(base ?? [])];
  for (const extra of extras ?? []) {
    if (!extra?.id || ids.has(extra.id)) continue;
    out.push({ ...extra });
    ids.add(extra.id);
  }
  out.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return capAudit(out);
}

export function dumpAudit(): AuditEvent[] {
  return events.map((row) => ({ ...row }));
}

export function listAudit(): AuditEvent[] {
  return dumpAudit();
}

export function replaceAudit(rows: AuditEvent[] | undefined | null) {
  events = capAudit(Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []);
}

export function actorFromStaff(user: { id: string; name: string; role: StaffRole | string }): AuditActor {
  return { staffId: user.id, staffName: user.name, role: user.role };
}

export function appendAudit(
  input: AuditActor & { action: AuditAction; target: string; detail?: string },
): AuditEvent {
  const event: AuditEvent = {
    id: newAuditId(),
    at: new Date().toISOString(),
    staffId: input.staffId,
    staffName: input.staffName,
    role: input.role,
    action: input.action,
    target: input.target,
    detail: input.detail,
  };
  events = capAudit([...events, event]);
  return { ...event };
}

export function siteCreateEvents(reservations: Array<{ id: string; guestName: string }>): AuditEvent[] {
  return reservations.map((row) => ({
    id: newAuditId(),
    at: new Date().toISOString(),
    ...SITE_AUDIT_ACTOR,
    action: "reserva.criar" as const,
    target: row.id,
    detail: row.guestName,
  }));
}
