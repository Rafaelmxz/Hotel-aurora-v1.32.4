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
  overbookingMode: OverbookingMode;
  depositPercent: number;
};

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
  overbookingMode: "bloquear",
  depositPercent: 30,
};

let property: PropertyProfile = { ...DEFAULT_PROPERTY };

export function getProperty(): PropertyProfile {
  return { ...property };
}

export function replaceProperty(next: PropertyProfile) {
  property = { ...next };
}

export function saveProperty(next: PropertyProfile): PropertyProfile {
  property = {
    ...next,
    name: next.name.trim() || DEFAULT_PROPERTY.name,
    hotelId: next.hotelId.trim() || DEFAULT_PROPERTY.hotelId,
    pixKey: next.pixKey.trim(),
    pixPayee: next.pixPayee.trim(),
  };
  return getProperty();
}
