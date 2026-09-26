import type { RoomType } from "@/mocks/hotelData";

export const offerKeys = {
  all: ["offers"] as const,
};

export type OfferKind = "percent" | "fixed";

export type Offer = {
  id: string;
  name: string;
  kind: OfferKind;
  value: number;
  percent: number;
  start: string;
  end: string;
  roomTypes: RoomType[];
  weekdays: number[];
  pixOnly: boolean;
  minNights: number;
  active: boolean;
};

function withAlias(offer: Offer): Offer {
  return {
    ...offer,
    roomTypes: [...offer.roomTypes],
    weekdays: [...offer.weekdays],
    percent: offer.kind === "percent" ? offer.value : 0,
  };
}

const SEED: Offer[] = [
  {
    id: "off-pix",
    name: "Desconto Pix",
    kind: "percent",
    value: 5,
    percent: 5,
    start: "2026-01-01",
    end: "2026-12-31",
    roomTypes: [],
    weekdays: [],
    pixOnly: true,
    minNights: 0,
    active: true,
  },
  {
    id: "off-semana",
    name: "30% off Segunda a Quinta",
    kind: "percent",
    value: 30,
    percent: 30,
    start: "2026-01-01",
    end: "2026-12-31",
    roomTypes: ["Standard", "Luxo"],
    weekdays: [1, 2, 3, 4],
    pixOnly: false,
    minNights: 0,
    active: true,
  },
  {
    id: "off-3noites",
    name: "Estadia 3 noites",
    kind: "percent",
    value: 10,
    percent: 10,
    start: "2026-01-01",
    end: "2026-12-31",
    roomTypes: [],
    weekdays: [],
    pixOnly: false,
    minNights: 3,
    active: true,
  },
];

let offers: Offer[] = SEED.map(withAlias);
let seq = offers.length + 1;

export function listOffers(): Offer[] {
  return offers.map(withAlias);
}

export function replaceOffers(rows: Offer[]) {
  offers = rows.map(withAlias);
  seq = offers.length + 1;
}

export function addOffer(input: Omit<Offer, "id" | "percent">): Offer {
  const offer = withAlias({
    ...input,
    id: `off-${String(seq++).padStart(3, "0")}`,
    name: input.name.trim(),
    percent: 0,
  });
  offers = [...offers, offer];
  return withAlias(offer);
}

export function patchOffer(id: string, patch: Partial<Omit<Offer, "id">>): Offer {
  const index = offers.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Oferta não encontrada");
  const next = withAlias({ ...offers[index]!, ...patch });
  offers = [...offers.slice(0, index), next, ...offers.slice(index + 1)];
  return withAlias(next);
}

export function removeOffer(id: string): void {
  offers = offers.filter((row) => row.id !== id);
}

export function offerDiscount(amount: number, offer: Offer) {
  if (offer.kind === "percent") return Math.round(amount * (offer.value / 100));
  return Math.min(amount, Math.round(offer.value));
}

export function offerApplies(
  offer: Offer,
  input: {
    dateIso: string;
    weekday: number;
    roomType: RoomType;
    pix?: boolean;
    nights?: number;
  },
) {
  if (!offer.active) return false;
  if (input.dateIso < offer.start || input.dateIso > offer.end) return false;
  if (offer.roomTypes.length > 0 && !offer.roomTypes.includes(input.roomType)) return false;
  if (offer.weekdays.length > 0 && !offer.weekdays.includes(input.weekday)) return false;
  if (offer.pixOnly && !input.pix) return false;
  if (offer.minNights > 0 && (input.nights ?? 0) < offer.minNights) return false;
  return true;
}

export function strongestOffer(amount: number, candidates: Offer[]) {
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, current) =>
    offerDiscount(amount, current) >= offerDiscount(amount, best) ? current : best,
  );
}
