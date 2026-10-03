/**
 * Equipe, PIN de elevação e idle da sessão elevada.
 * Pode: semente/login sem PIN 1234; Equipe grava PIN; idle 15 min derruba admin/gerente; elevação com PIN gera diário.
 * Proibido: reelevar no F5 pelo e-mail; mexer no cookie auth; hash; MFA; gravar o PIN no diário.
 * Fallback idle: recepcionista (ou governança/financeiro). Sem fallback, não derruba.
 * Store: este arquivo. Idle UI: useIdleStaffTimeout. PIN: patchStaff na Equipe.
 */
import { assertValidEmail, normalizeEmail } from "@/lib/email";
import { actorFromStaff, appendAudit } from "@/features/audit/auditStore";
import { isPrivilegeElevation, requiresPin, type StaffRole } from "./roles";

export const staffKeys = {
  all: ["staff"] as const,
  session: ["staff", "session"] as const,
};

export type StaffStatus = "ativo" | "inativo";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  pin?: string;
};

export class PinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PinError";
  }
}

const SEED: StaffUser[] = [
  {
    id: "usr-admin",
    name: "Ana Souza",
    email: "ana.souza@hotelaurora.com",
    role: "admin",
    status: "ativo",
  },
  {
    id: "usr-gerente",
    name: "Elisa Prado",
    email: "elisa.prado@hotelaurora.com",
    role: "gerente",
    status: "ativo",
  },
  {
    id: "usr-recepcao",
    name: "Bruno Lima",
    email: "bruno.lima@hotelaurora.com",
    role: "recepcionista",
    status: "ativo",
  },
  {
    id: "usr-gov",
    name: "Carla Mendes",
    email: "carla.mendes@hotelaurora.com",
    role: "governanca",
    status: "ativo",
  },
  {
    id: "usr-fin",
    name: "Diego Alves",
    email: "diego.alves@hotelaurora.com",
    role: "financeiro",
    status: "ativo",
  },
];

let users: StaffUser[] = SEED.map((row) => ({ ...row }));
let seq = users.length + 1;
let sessionId = "usr-admin";
let boundAuthUserId: string | null = null;

const STORAGE_KEY = "pms-staff-session";
const ACTIVITY_KEY = "pms-staff-activity";
export const STAFF_IDLE_MS = 15 * 60 * 1000;

const IDLE_FALLBACK_ROLES: StaffRole[] = ["recepcionista", "governanca", "financeiro"];

function readLastActivity(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return Date.now();
  const n = Number(raw);
  return Number.isFinite(n) ? n : Date.now();
}

export function touchStaffActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

function persistSessionId() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, sessionId);
  touchStaffActivity();
}

function pickIdleFallback(exceptId: string): StaffUser | undefined {
  const pool = users.filter(
    (row) => row.status === "ativo" && row.id !== exceptId && !requiresPin(row.role),
  );
  for (const role of IDLE_FALLBACK_ROLES) {
    const hit = pool.find((row) => row.role === role);
    if (hit) return hit;
  }
  return pool[0];
}

export function demoteElevatedSession(): StaffUser | null {
  const current = users.find((row) => row.id === sessionId);
  if (!current || !requiresPin(current.role)) return null;
  const fallback = pickIdleFallback(current.id);
  if (!fallback) return null;
  sessionId = fallback.id;
  persistSessionId();
  return publicUser(fallback);
}

export function maybeDemoteIdleSession(): StaffUser | null {
  const current = users.find((row) => row.id === sessionId);
  if (!current || !requiresPin(current.role)) return null;
  if (Date.now() - readLastActivity() < STAFF_IDLE_MS) return null;
  return demoteElevatedSession();
}

export function msUntilStaffIdle(): number {
  const current = users.find((row) => row.id === sessionId);
  if (!current || !requiresPin(current.role)) return Number.POSITIVE_INFINITY;
  return STAFF_IDLE_MS - (Date.now() - readLastActivity());
}

function publicUser(user: StaffUser): StaffUser {
  const { pin: _pin, ...rest } = user;
  return { ...rest, pin: user.pin ? "****" : undefined };
}

function countActiveAdmins() {
  return users.filter((row) => row.role === "admin" && row.status === "ativo").length;
}

export function hydrateStaffSession() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && users.some((row) => row.id === saved && row.status === "ativo")) {
    sessionId = saved;
  }
  maybeDemoteIdleSession();
}

export function listStaff(): StaffUser[] {
  return users.map(publicUser);
}

export function dumpStaff(): StaffUser[] {
  return users.map((row) => ({ ...row }));
}

export function replaceStaff(rows: StaffUser[]) {
  users = rows.map((row) => ({ ...row }));
  seq = users.length + 1;
  if (!users.some((row) => row.id === sessionId && row.status === "ativo")) {
    sessionId = users.find((row) => row.status === "ativo")?.id ?? sessionId;
  }
}

export function getSessionUser(): StaffUser {
  const user = users.find((row) => row.id === sessionId && row.status === "ativo") ?? users[0]!;
  return publicUser(user);
}

export function findStaff(id: string): StaffUser | undefined {
  const user = users.find((row) => row.id === id);
  return user ? publicUser(user) : undefined;
}

export function findStaffByEmail(email: string): StaffUser | undefined {
  const normalized = normalizeEmail(email);
  const user = users.find((row) => normalizeEmail(row.email) === normalized);
  return user ? publicUser(user) : undefined;
}

export function setSessionUser(id: string, pin?: string): StaffUser {
  const user = users.find((row) => row.id === id && row.status === "ativo");
  if (!user) throw new Error("Usuário inativo ou não encontrado");
  const current = users.find((row) => row.id === sessionId) ?? users[0]!;
  if (current.id !== user.id && isPrivilegeElevation(current.role, user.role)) {
    if (!user.pin) {
      throw new PinError("Defina um PIN de 4 dígitos para este perfil na Equipe.");
    }
    if (pin !== user.pin) {
      throw new PinError("Acesso negado: PIN incorreto");
    }
    appendAudit({
      ...actorFromStaff(current),
      action: "equipe.elevar",
      target: user.id,
      detail: user.name,
    });
  }
  sessionId = user.id;
  persistSessionId();
  return publicUser(user);
}

export function assumeStaffSession(id: string): StaffUser {
  const user = users.find((row) => row.id === id && row.status === "ativo");
  if (!user) throw new Error("Usuário inativo ou não encontrado");
  sessionId = user.id;
  persistSessionId();
  return publicUser(user);
}

export function bindAuthToStaff(input: {
  authUserId: string;
  email: string | null;
  name: string | null;
  membershipRole: StaffRole;
}): { user: StaffUser; created: boolean } {
  if (boundAuthUserId === input.authUserId) {
    return { user: getSessionUser(), created: false };
  }
  boundAuthUserId = input.authUserId;
  const email = input.email ? normalizeEmail(input.email) : null;
  if (email) {
    const match = users.find(
      (row) => normalizeEmail(row.email) === email && row.status === "ativo",
    );
    if (match) {
      const current = users.find((row) => row.id === sessionId);
      if (current && current.id !== match.id && requiresPin(match.role)) {
        return { user: getSessionUser(), created: false };
      }
      return { user: assumeStaffSession(match.id), created: false };
    }
  }
  if (!email) {
    return { user: getSessionUser(), created: false };
  }
  const role = input.membershipRole;
  try {
    const created = inviteStaff({
      name: (input.name ?? "").trim() || email.split("@")[0] || "Equipe",
      email,
      role,
    });
    return { user: assumeStaffSession(created.id), created: true };
  } catch {
    const match = users.find(
      (row) => normalizeEmail(row.email) === email && row.status === "ativo",
    );
    if (match) {
      const current = users.find((row) => row.id === sessionId);
      if (current && current.id !== match.id && requiresPin(match.role)) {
        return { user: getSessionUser(), created: false };
      }
      return { user: assumeStaffSession(match.id), created: false };
    }
    throw new Error("Não foi possível vincular a conta à equipe.");
  }
}

export function inviteStaff(input: {
  name: string;
  email: string;
  role: StaffRole;
  pin?: string;
}): StaffUser {
  const email = assertValidEmail(input.email);
  if (users.some((row) => row.email === email)) {
    throw new Error("Já existe alguém na equipe com este e-mail.");
  }
  const user: StaffUser = {
    id: `usr-${String(seq++).padStart(3, "0")}`,
    name: input.name.trim(),
    email,
    role: input.role,
    status: "ativo",
    pin: input.pin,
  };
  users = [...users, user];
  return publicUser(user);
}

export function patchStaff(
  id: string,
  patch: Partial<Pick<StaffUser, "name" | "email" | "role" | "status" | "pin">>,
): StaffUser {
  const index = users.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Usuário não encontrado");
  const current = users[index]!;
  const next = { ...current, ...patch };
  if (patch.email !== undefined) next.email = assertValidEmail(patch.email);
  if (patch.pin === "") delete next.pin;
  const wasLastActiveAdmin =
    current.role === "admin" && current.status === "ativo" && countActiveAdmins() <= 1;
  if (wasLastActiveAdmin && (next.status === "inativo" || next.role !== "admin")) {
    throw new Error("Não é possível desativar ou rebaixar o último administrador.");
  }
  users = [...users.slice(0, index), next, ...users.slice(index + 1)];
  if (sessionId === id && next.status === "inativo") {
    const fallback = users.find((row) => row.status === "ativo") ?? next;
    sessionId = fallback.id;
  }
  return publicUser(next);
}

export function removeStaff(id: string): void {
  const target = users.find((row) => row.id === id);
  if (!target) throw new Error("Usuário não encontrado");
  if (target.id === sessionId) {
    throw new Error("Não é possível excluir quem está na sessão agora.");
  }
  if (target.role === "admin" && target.status === "ativo" && countActiveAdmins() <= 1) {
    throw new Error("Não é possível excluir o último administrador ativo.");
  }
  users = users.filter((row) => row.id !== id);
}

hydrateStaffSession();
