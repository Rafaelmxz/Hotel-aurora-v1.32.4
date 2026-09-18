import type { RoomType } from "@/mocks/hotelData";

export const rateKeys = {
  all: ["rates"] as const,
  seasons: ["rates", "seasons"] as const,
  packages: ["rates", "packages"] as const,
  promos: ["rates", "promos"] as const,
};

export type MealPlan = "cafe" | "pensao";
export type PaxCount = 1 | 2;

export type RateBand = {
  pax1Cafe: number;
  pax1Pensao: number;
  pax2Cafe: number;
  pax2Pensao: number;
};

export type CategoryRate = {
  type: RoomType;
  weekday: RateBand;
  weekend: RateBand;
  weekdayRate: number;
  weekendRate: number;
};

export type SeasonModifier = "percent" | "fixed";

export type Season = {
  id: string;
  name: string;
  start: string;
  end: string;
  modifier: SeasonModifier;
  value: number;
  minNights: number;
};

export type SpecialPackage = {
  id: string;
  name: string;
  start: string;
  end: string;
  minNights: number;
  roomType: RoomType | "todas";
};

export type PromoKind = "percent" | "fixed";

export type PromoCode = {
  id: string;
  code: string;
  kind: PromoKind;
  value: number;
  start: string;
  end: string;
  usageLimit: number;
  usageCount: number;
  active: boolean;
};

function band(pax1Cafe: number, pax1Pensao: number, pax2Cafe: number, pax2Pensao: number): RateBand {
  return { pax1Cafe, pax1Pensao, pax2Cafe, pax2Pensao };
}

function withLegacy(type: RoomType, weekday: RateBand, weekend: RateBand): CategoryRate {
  return {
    type,
    weekday,
    weekend,
    weekdayRate: weekday.pax2Cafe,
    weekendRate: weekend.pax2Cafe,
  };
}

const CATEGORY_SEED: CategoryRate[] = [
  withLegacy("Standard", band(280, 340, 320, 390), band(340, 400, 390, 470)),
  withLegacy("Luxo", band(470, 550, 540, 640), band(590, 680, 680, 790)),
  withLegacy("Suíte", band(780, 890, 890, 1040), band(980, 1120, 1120, 1290)),
];

const SEASON_SEED: Season[] = [
  {
    id: "sea-reveillon",
    name: "Réveillon",
    start: "2026-12-28",
    end: "2027-01-02",
    modifier: "percent",
    value: 40,
    minNights: 3,
  },
  {
    id: "sea-carnaval",
    name: "Carnaval",
    start: "2026-02-14",
    end: "2026-02-18",
    modifier: "percent",
    value: 30,
    minNights: 3,
  },
  {
    id: "sea-julho",
    name: "Alta temporada julho",
    start: "2026-07-01",
    end: "2026-07-31",
    modifier: "fixed",
    value: 80,
    minNights: 2,
  },
];

const PACKAGE_SEED: SpecialPackage[] = [
  {
    id: "pkg-lua",
    name: "Lua de mel",
    start: "2026-09-11",
    end: "2026-09-14",
    minNights: 2,
    roomType: "Suíte",
  },
  {
    id: "pkg-feriado",
    name: "Feriado prolongado",
    start: "2026-11-14",
    end: "2026-11-16",
    minNights: 2,
    roomType: "todas",
  },
];

const PROMO_SEED: PromoCode[] = [
  {
    id: "pro-vip",
    code: "CLIENTEVIP",
    kind: "percent",
    value: 10,
    start: "2026-01-01",
    end: "2026-12-31",
    usageLimit: 30,
    usageCount: 4,
    active: true,
  },
  {
    id: "pro-noiva",
    code: "NOIVAVIP",
    kind: "percent",
    value: 15,
    start: "2026-01-01",
    end: "2026-12-31",
    usageLimit: 10,
    usageCount: 1,
    active: true,
  },
];

let categories: CategoryRate[] = CATEGORY_SEED.map((row) => ({
  ...row,
  weekday: { ...row.weekday },
  weekend: { ...row.weekend },
}));
let seasons: Season[] = SEASON_SEED.map((row) => ({ ...row }));
let packages: SpecialPackage[] = PACKAGE_SEED.map((row) => ({ ...row }));
let promos: PromoCode[] = PROMO_SEED.map((row) => ({ ...row }));
let seasonSeq = seasons.length + 1;
let packageSeq = packages.length + 1;
let promoSeq = promos.length + 1;

export function listCategoryRates(): CategoryRate[] {
  return categories.map((row) => ({
    ...row,
    weekday: { ...row.weekday },
    weekend: { ...row.weekend },
  }));
}

export function replaceRates(next: {
  categories: CategoryRate[];
  seasons: Season[];
  packages: SpecialPackage[];
  promos: PromoCode[];
}) {
  categories = next.categories.map((row) => withLegacy(row.type, row.weekday, row.weekend));
  seasons = next.seasons.map((row) => ({ ...row }));
  packages = next.packages.map((row) => ({ ...row }));
  promos = next.promos.map((row) => ({ ...row }));
  seasonSeq = seasons.length + 1;
  packageSeq = packages.length + 1;
  promoSeq = promos.length + 1;
}

export function pickNightRate(
  category: CategoryRate,
  weekend: boolean,
  pax: PaxCount,
  meal: MealPlan,
) {
  const band = weekend ? category.weekend : category.weekday;
  if (pax === 1) return meal === "pensao" ? band.pax1Pensao : band.pax1Cafe;
  return meal === "pensao" ? band.pax2Pensao : band.pax2Cafe;
}

export function patchCategoryRate(
  type: RoomType,
  patch: Partial<Pick<CategoryRate, "weekday" | "weekend" | "weekdayRate" | "weekendRate">>,
): CategoryRate {
  const index = categories.findIndex((row) => row.type === type);
  if (index < 0) throw new Error("Categoria não encontrada");
  const current = categories[index]!;
  const weekday = { ...current.weekday, ...patch.weekday };
  const weekend = { ...current.weekend, ...patch.weekend };
  if (patch.weekdayRate != null) weekday.pax2Cafe = patch.weekdayRate;
  if (patch.weekendRate != null) weekend.pax2Cafe = patch.weekendRate;
  const next = withLegacy(type, weekday, weekend);
  categories = [...categories.slice(0, index), next, ...categories.slice(index + 1)];
  return { ...next, weekday: { ...next.weekday }, weekend: { ...next.weekend } };
}

export function listSeasons(): Season[] {
  return seasons.map((row) => ({ ...row }));
}

export function addSeason(input: Omit<Season, "id">): Season {
  const season: Season = {
    ...input,
    id: `sea-${String(seasonSeq++).padStart(3, "0")}`,
    name: input.name.trim(),
  };
  seasons = [...seasons, season];
  return { ...season };
}

export function removeSeason(id: string): void {
  seasons = seasons.filter((row) => row.id !== id);
}

export function listPackages(): SpecialPackage[] {
  return packages.map((row) => ({ ...row }));
}

export function addPackage(input: Omit<SpecialPackage, "id">): SpecialPackage {
  const item: SpecialPackage = {
    ...input,
    id: `pkg-${String(packageSeq++).padStart(3, "0")}`,
    name: input.name.trim(),
  };
  packages = [...packages, item];
  return { ...item };
}

export function removePackage(id: string): void {
  packages = packages.filter((row) => row.id !== id);
}

export function listPromos(): PromoCode[] {
  return promos.map((row) => ({ ...row }));
}

export function addPromo(input: Omit<PromoCode, "id" | "usageCount">): PromoCode {
  const promo: PromoCode = {
    ...input,
    id: `pro-${String(promoSeq++).padStart(3, "0")}`,
    code: input.code.trim().toUpperCase(),
    usageCount: 0,
  };
  promos = [...promos, promo];
  return { ...promo };
}

export function removePromo(id: string): void {
  promos = promos.filter((row) => row.id !== id);
}

export function findPromo(code: string): PromoCode | undefined {
  const normalized = code.trim().toUpperCase();
  return promos.find((row) => row.code === normalized);
}

export function consumePromo(code: string): PromoCode {
  const index = promos.findIndex((row) => row.code === code.trim().toUpperCase());
  if (index < 0) throw new Error("Cupom não encontrado");
  const current = promos[index]!;
  if (!current.active) throw new Error("Cupom inativo");
  if (current.usageCount >= current.usageLimit) throw new Error("Cupom esgotado");
  const next = { ...current, usageCount: current.usageCount + 1 };
  promos = [...promos.slice(0, index), next, ...promos.slice(index + 1)];
  return { ...next };
}
