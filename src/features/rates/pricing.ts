import { addDays, differenceInCalendarDays } from "date-fns";
import { parseISODate, type RoomType } from "@/mocks/hotelData";
import {
  listOffers,
  offerApplies,
  offerDiscount,
  strongestOffer,
  type Offer,
} from "./offerStore";
import {
  findPromo,
  listCategoryRates,
  listPackages,
  listSeasons,
  occupancyNightRate,
  type CategoryRate,
  type MealPlan,
  type PromoCode,
  type Season,
  type SpecialPackage,
} from "./rateStore";

export type NightQuote = {
  date: string;
  base: number;
  weekend: boolean;
  season?: Season;
  offer?: Offer;
  amount: number;
};

export type StayQuote = {
  roomType: RoomType;
  checkIn: string;
  checkOut: string;
  nights: number;
  nightsDetail: NightQuote[];
  subtotal: number;
  discount: number;
  total: number;
  averageNight: number;
  minNightsRequired: number;
  minNightsOk: boolean;
  mealPlan: MealPlan;
  pax: number;
  adults: number;
  children: number;
  promo?: PromoCode;
  packages: SpecialPackage[];
  appliedOffers: Offer[];
  offerDiscountTotal: number;
};

export type QuoteOptions = {
  pax?: number;
  adults?: number;
  children?: number;
  mealPlan?: MealPlan;
  promoCode?: string;
  pix?: boolean;
  segment?: "balcao" | "site";
  categories?: CategoryRate[];
  seasons?: Season[];
};

function resolveAdults(options: QuoteOptions) {
  const raw = options.adults ?? options.pax ?? 2;
  return Math.min(6, Math.max(1, Math.round(raw) || 1));
}

function resolveChildren(options: QuoteOptions) {
  return Math.min(4, Math.max(0, Math.round(options.children ?? 0) || 0));
}

function isWeekendNight(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6;
}

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function seasonsOn(dateIso: string, seasons = listSeasons()): Season[] {
  return seasons.filter((season) => dateIso >= season.start && dateIso <= season.end);
}

export type NightPaint = {
  date: string;
  weekend: boolean;
  base: number;
  amount: number;
  season?: Season;
};

export function paintNight(
  roomType: RoomType,
  dateIso: string,
  options: QuoteOptions = {},
): NightPaint {
  const date = parseISODate(dateIso);
  const weekend = isWeekendNight(date);
  const adults = resolveAdults(options);
  const children = resolveChildren(options);
  const category = (options.categories ?? listCategoryRates()).find((row) => row.type === roomType);
  const base = category ? occupancyNightRate(category, weekend, adults, children) : 0;
  const season = strongestSeason(base, seasonsOn(dateIso, options.seasons ?? listSeasons()));
  return {
    date: dateIso,
    weekend,
    base,
    amount: season ? applySeason(base, season) : base,
    season,
  };
}

function applySeason(base: number, season: Season) {
  if (season.modifier === "percent") {
    return Math.round(base * (1 + season.value / 100));
  }
  return Math.round(base + season.value);
}

function strongestSeason(base: number, seasons: Season[]): Season | undefined {
  if (seasons.length === 0) return undefined;
  return seasons.reduce((best, current) =>
    applySeason(base, current) >= applySeason(base, best) ? current : best,
  );
}

function packagesOn(
  checkIn: string,
  checkOut: string,
  roomType: RoomType,
): SpecialPackage[] {
  return listPackages().filter((item) => {
    if (item.roomType !== "todas" && item.roomType !== roomType) return false;
    return checkIn < item.end && checkOut > item.start;
  });
}

export function applyPromoAmount(subtotal: number, promo: PromoCode) {
  if (promo.kind === "percent") return Math.round(subtotal * (promo.value / 100));
  return Math.min(subtotal, Math.round(promo.value));
}

export function quoteStay(
  roomType: RoomType,
  checkIn: string,
  checkOut: string,
  options: QuoteOptions = {},
): StayQuote {
  const adults = resolveAdults(options);
  const children = resolveChildren(options);
  const pax = adults;
  const mealPlan = options.mealPlan ?? "cafe";
  const start = parseISODate(checkIn);
  const end = parseISODate(checkOut);
  const nights = Math.max(1, differenceInCalendarDays(end, start));
  const category = (options.categories ?? listCategoryRates()).find((row) => row.type === roomType);
  const allSeasons = listSeasons();
  const nightsDetail: NightQuote[] = [];

  for (let i = 0; i < nights; i += 1) {
    const date = addDays(start, i);
    const dateIso = toISO(date);
    const weekendNight = isWeekendNight(date);
    const raw = category
      ? occupancyNightRate(category, weekendNight, adults, children)
      : 0;
    const siteCut =
      options.segment === "site" ? Math.round((category?.sitePercent ?? 0)) : 0;
    const base = Math.max(0, Math.round(raw * (1 + siteCut / 100)));
    const season = strongestSeason(base, seasonsOn(dateIso, allSeasons));
    let amount = season ? applySeason(base, season) : base;
    const offer = strongestOffer(
      amount,
      listOffers().filter((item) =>
        offerApplies(item, {
          dateIso,
          weekday: date.getDay(),
          roomType,
          pix: options.pix,
          nights,
        }),
      ),
    );
    if (offer) amount = Math.max(0, amount - offerDiscount(amount, offer));
    nightsDetail.push({
      date: dateIso,
      base,
      weekend: weekendNight,
      season,
      offer,
      amount,
    });
  }

  const subtotal = nightsDetail.reduce((sum, night) => sum + night.amount, 0);
  const matchedPackages = packagesOn(checkIn, checkOut, roomType);
  const minNightsRequired = Math.max(
    1,
    ...nightsDetail.map((night) => night.season?.minNights ?? 1),
    ...matchedPackages.map((item) => item.minNights),
  );

  let promo: PromoCode | undefined;
  let discount = 0;
  if (options.promoCode) {
    const found = findPromo(options.promoCode);
    const stayDay = checkIn;
    if (
      found &&
      found.active &&
      found.usageCount < found.usageLimit &&
      stayDay >= found.start &&
      stayDay <= found.end
    ) {
      promo = found;
      discount = applyPromoAmount(subtotal, found);
    }
  }

  const total = Math.max(0, subtotal - discount);
  const appliedOffers = [
    ...new Map(
      nightsDetail
        .flatMap((night) => (night.offer ? [night.offer] : []))
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const offerDiscountTotal = nightsDetail.reduce((sum, night) => {
    if (!night.offer) return sum;
    const before = night.season ? applySeason(night.base, night.season) : night.base;
    return sum + (before - night.amount);
  }, 0);

  return {
    roomType,
    checkIn,
    checkOut,
    nights,
    nightsDetail,
    subtotal,
    discount,
    total,
    averageNight: Math.round(total / nights),
    minNightsRequired,
    minNightsOk: nights >= minNightsRequired,
    mealPlan,
    pax,
    adults,
    children,
    promo,
    packages: matchedPackages,
    appliedOffers,
    offerDiscountTotal,
  };
}
