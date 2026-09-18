export type StaffRole = "admin" | "gerente" | "recepcionista" | "governanca" | "financeiro";

export type Permission =
  | "dashboard"
  | "calendar"
  | "housekeeping"
  | "cash"
  | "rates"
  | "crm"
  | "reports"
  | "booking"
  | "settings"
  | "users";

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Administrador / Dono",
  gerente: "Gerente",
  recepcionista: "Recepcionista",
  governanca: "Governança / Limpeza",
  financeiro: "Financeiro",
};

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  admin: [
    "dashboard",
    "calendar",
    "housekeeping",
    "cash",
    "rates",
    "crm",
    "reports",
    "booking",
    "settings",
    "users",
  ],
  gerente: [
    "dashboard",
    "calendar",
    "housekeeping",
    "cash",
    "rates",
    "crm",
    "reports",
    "booking",
    "settings",
  ],
  recepcionista: ["dashboard", "calendar", "cash", "crm", "booking"],
  governanca: ["housekeeping"],
  financeiro: ["dashboard", "cash", "reports"],
};

const PATH_PERMISSION: Array<{ prefix: string; permission: Permission | null }> = [
  { prefix: "/reservar", permission: null },
  { prefix: "/login", permission: null },
  { prefix: "/calendario", permission: "calendar" },
  { prefix: "/ocupacao", permission: "calendar" },
  { prefix: "/reservas", permission: "calendar" },
  { prefix: "/ofertas", permission: "rates" },
  { prefix: "/governanca", permission: "housekeeping" },
  { prefix: "/caixa", permission: "cash" },
  { prefix: "/tarifas", permission: "rates" },
  { prefix: "/hospedes", permission: "crm" },
  { prefix: "/relatorios", permission: "reports" },
  { prefix: "/reservas-diretas", permission: "booking" },
  { prefix: "/configuracoes", permission: "settings" },
  { prefix: "/equipe", permission: "users" },
  { prefix: "/", permission: "dashboard" },
];

const ROLE_RANK: Record<StaffRole, number> = {
  governanca: 0,
  recepcionista: 1,
  financeiro: 2,
  gerente: 3,
  admin: 4,
};

export const PIN_ROLES: StaffRole[] = ["admin", "gerente"];

export function requiresPin(role: StaffRole) {
  return PIN_ROLES.includes(role);
}

export function isPrivilegeElevation(from: StaffRole, to: StaffRole) {
  return requiresPin(to) && ROLE_RANK[to] > ROLE_RANK[from];
}

export function can(role: StaffRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionForPath(pathname: string): Permission | null {
  const match = PATH_PERMISSION.find((row) =>
    row.prefix === "/"
      ? pathname === "/"
      : pathname === row.prefix || pathname.startsWith(`${row.prefix}/`),
  );
  return match?.permission ?? "dashboard";
}

export function canAccessPath(role: StaffRole, pathname: string) {
  const permission = permissionForPath(pathname);
  if (permission === null) return true;
  return can(role, permission);
}

export function homeForRole(role: StaffRole) {
  if (role === "governanca") return "/governanca";
  if (role === "financeiro") return "/relatorios";
  return "/";
}
