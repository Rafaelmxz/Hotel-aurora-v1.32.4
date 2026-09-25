import { getProperty } from "@/features/settings/propertyStore";

export const bookingKeys = {
  config: ["booking-engine"] as const,
};

export type ExtraUnit = "hospede" | "noite" | "estadia";

export type BookingExtra = {
  id: string;
  name: string;
  price: number;
  unit: ExtraUnit;
  enabled: boolean;
};

export type BookingEngineConfig = {
  photos: string[];
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  pixKey: string;
  depositPercent: number;
  extras: BookingExtra[];
};

export const EXTRA_UNIT_LABEL: Record<ExtraUnit, string> = {
  hospede: "por hóspede",
  noite: "por noite",
  estadia: "por estadia",
};

export const DEFAULT_EXTRAS: BookingExtra[] = [
  { id: "cafe", name: "Café da manhã extra", price: 45, unit: "hospede", enabled: true },
  { id: "traslado", name: "Traslado aeroporto", price: 120, unit: "estadia", enabled: true },
  { id: "cama", name: "Cama extra", price: 80, unit: "noite", enabled: true },
];

const UNITS = new Set<ExtraUnit>(["hospede", "noite", "estadia"]);

export function normalizeExtras(list?: BookingExtra[] | null): BookingExtra[] {
  const byId = new Map((list ?? []).map((row) => [row.id, row]));
  return DEFAULT_EXTRAS.map((def) => {
    const row = byId.get(def.id);
    if (!row) return { ...def };
    const price = Number(row.price);
    return {
      id: def.id,
      name: row.name?.trim() || def.name,
      price: Number.isFinite(price) && price >= 0 ? Math.round(price) : def.price,
      unit: UNITS.has(row.unit) ? row.unit : def.unit,
      enabled: row.enabled !== false,
    };
  });
}

export function extraQuantity(extra: BookingExtra, nights: number, guests: number) {
  if (extra.unit === "hospede") return Math.max(1, guests);
  if (extra.unit === "noite") return Math.max(1, nights);
  return 1;
}

export function quoteExtras(
  catalog: BookingExtra[],
  selectedIds: string[],
  nights: number,
  guests: number,
) {
  const picked = new Set(selectedIds);
  const lines = catalog
    .filter((item) => item.enabled && picked.has(item.id) && item.price >= 0)
    .map((item) => {
      const quantity = extraQuantity(item, nights, guests);
      return {
        id: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity,
        total: item.price * quantity,
      };
    });
  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.total, 0),
  };
}

const DEFAULT_CONFIG: BookingEngineConfig = {
  photos: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=60",
  ],
  cancellationPolicy:
    "Cancelamento gratuito até 48h antes do check-in. Após esse prazo, o sinal de garantia não é reembolsável.",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  pixKey: "pix@hotelaurora.com",
  depositPercent: 30,
  extras: DEFAULT_EXTRAS.map((row) => ({ ...row })),
};

let config: BookingEngineConfig = {
  ...DEFAULT_CONFIG,
  photos: [...DEFAULT_CONFIG.photos],
  extras: DEFAULT_EXTRAS.map((row) => ({ ...row })),
};

export function getBookingConfig(): BookingEngineConfig {
  const property = getProperty();
  return {
    ...config,
    photos: [...config.photos],
    extras: normalizeExtras(config.extras),
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    pixKey: property.pixKey,
    depositPercent: property.depositPercent,
    cancellationPolicy: property.cancellationPolicy,
  };
}

export function replaceBookingConfig(next: BookingEngineConfig) {
  config = {
    ...next,
    photos: [...next.photos],
    extras: normalizeExtras(next.extras),
  };
}

export function saveBookingConfig(next: BookingEngineConfig): BookingEngineConfig {
  config = {
    ...next,
    photos: next.photos.map((url) => url.trim()).filter(Boolean),
    cancellationPolicy: next.cancellationPolicy.trim(),
    pixKey: next.pixKey.trim(),
    extras: normalizeExtras(next.extras),
  };
  return getBookingConfig();
}
