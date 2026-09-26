/**
 * Política da casa: check-in, check-out e cancelamento.
 * A tela Hotel edita. Site e ficha só leem.
 * Proibido: mudar preço, Experiências, ouro, OTA.
 * Cofre: campo `property`. Vault antigo sem cancelamento usa o padrão.
 */
export const propertyKeys = {
  current: ["property"] as const,
};

export type OverbookingMode = "bloquear" | "alertar";

export type PropertyProfile = {
  hotelId: string;
  name: string;
  logoUrl: string;
  cnpj: string;
  phone: string;
  address: string;
  pixKey: string;
  pixPayee: string;
  transferInstructions: string;
  checkInTime: string;
  checkOutTime: string;
  lateCheckoutMinutes: number;
  cancelFreeHours: number;
  cancellationPolicy: string;
  overbookingMode: OverbookingMode;
  depositPercent: number;
};

export function defaultCancellationPolicy(hours: number) {
  return `Cancelamento gratuito até ${hours}h antes do check-in. Depois desse prazo, o sinal não é reembolsável.`;
}

export function alignCancellationPolicy(text: string, hours: number) {
  const trimmed = text.trim();
  if (!trimmed) return defaultCancellationPolicy(hours);
  const next = trimmed
    .replace(/até\s*\d+\s*h(?:oras)?/gi, `até ${hours}h`)
    .replace(/\b\d+\s*h(?:oras)?\s+antes/gi, `${hours}h antes`);
  return /\d+\s*h/.test(next) ? next : defaultCancellationPolicy(hours);
}

const DEFAULT_PROPERTY: PropertyProfile = {
  hotelId: "hotel-aurora",
  name: "Hotel Aurora",
  logoUrl: "",
  cnpj: "12.345.678/0001-90",
  phone: "(11) 4000-2026",
  address: "Rua das Palmeiras, 120 — Centro, Serra Azul/SP",
  pixKey: "pix@hotelaurora.com",
  pixPayee: "Hotel Aurora Hospedagem Ltda",
  transferInstructions: "Enviar o comprovante do sinal pelo WhatsApp da recepção.",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  lateCheckoutMinutes: 60,
  cancelFreeHours: 48,
  cancellationPolicy: defaultCancellationPolicy(48),
  overbookingMode: "bloquear",
  depositPercent: 30,
};

function asTime(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function asHours(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(168, Math.max(0, Math.round(n)));
}

export function normalizeProperty(raw?: Partial<PropertyProfile> | null): PropertyProfile {
  const hours = asHours(raw?.cancelFreeHours, DEFAULT_PROPERTY.cancelFreeHours);
  const policy = alignCancellationPolicy(
    typeof raw?.cancellationPolicy === "string" ? raw.cancellationPolicy : "",
    hours,
  );
  return {
    ...DEFAULT_PROPERTY,
    ...raw,
    name: (raw?.name ?? DEFAULT_PROPERTY.name).trim() || DEFAULT_PROPERTY.name,
    hotelId: (raw?.hotelId ?? DEFAULT_PROPERTY.hotelId).trim() || DEFAULT_PROPERTY.hotelId,
    pixKey: (raw?.pixKey ?? DEFAULT_PROPERTY.pixKey).trim(),
    pixPayee: (raw?.pixPayee ?? DEFAULT_PROPERTY.pixPayee).trim(),
    checkInTime: asTime(raw?.checkInTime, DEFAULT_PROPERTY.checkInTime),
    checkOutTime: asTime(raw?.checkOutTime, DEFAULT_PROPERTY.checkOutTime),
    lateCheckoutMinutes: asHours(raw?.lateCheckoutMinutes, DEFAULT_PROPERTY.lateCheckoutMinutes),
    cancelFreeHours: hours,
    cancellationPolicy: policy,
    overbookingMode: raw?.overbookingMode === "alertar" ? "alertar" : "bloquear",
    depositPercent: [30, 50, 100].includes(Number(raw?.depositPercent))
      ? Number(raw?.depositPercent)
      : DEFAULT_PROPERTY.depositPercent,
  };
}

let property: PropertyProfile = { ...DEFAULT_PROPERTY };

export function getProperty(): PropertyProfile {
  property = normalizeProperty(property);
  return { ...property };
}

export function replaceProperty(next: PropertyProfile) {
  property = normalizeProperty(next);
}

export function saveProperty(next: PropertyProfile): PropertyProfile {
  property = normalizeProperty(next);
  return getProperty();
}

export function cancellationDeadline(checkIn: string, profile = getProperty()): Date {
  const start = new Date(`${checkIn}T${profile.checkInTime}:00`);
  return new Date(start.getTime() - profile.cancelFreeHours * 60 * 60 * 1000);
}

export function isCancelFree(checkIn: string, at = new Date(), profile = getProperty()) {
  return at.getTime() <= cancellationDeadline(checkIn, profile).getTime();
}

export function stayHoursLabel(profile = getProperty()) {
  return `Check-in ${profile.checkInTime} · Check-out ${profile.checkOutTime}`;
}
