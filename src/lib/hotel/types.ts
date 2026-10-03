import type { Reservation, ReservationStatus } from "@/mocks/hotelData";
import type { RoomState } from "@/features/rooms/roomStore";
import type { ConsumoItem, PagamentoItem } from "@/features/reservations/types/folio";
import type { CashClose } from "@/features/finance/cashStore";
import type { PropertyProfile } from "@/features/settings/propertyStore";
import type { BookingEngineConfig } from "@/features/direct-booking/bookingStore";
import type { CategoryRate, PromoCode, Season, SpecialPackage } from "@/features/rates/rateStore";
import type { Offer } from "@/features/rates/offerStore";
import type { StaffUser } from "@/features/users/userStore";
import type { AuditEvent } from "@/features/audit/auditStore";
import type { Guest } from "@/features/guests/guestStore";
import type { StaffRole } from "@/features/users/roles";
import type { RoomBlock } from "@/features/reservations/blockStore";
import type { SaleClose } from "@/features/reservations/saleCloseStore";
import type { RoomTypeProfile } from "@/features/rooms/roomTypeStore";

export const VAULT_ID = "aurora";
export const VAULT_VERSION = 1;

export type HotelVault = {
  version: number;
  savedAt: number;
  rooms: RoomState[];
  reservations: Reservation[];
  blocks: RoomBlock[];
  saleCloses?: SaleClose[];
  consumos: ConsumoItem[];
  pagamentos: PagamentoItem[];
  guests: Guest[];
  cashCloses: CashClose[];
  property: PropertyProfile;
  booking: BookingEngineConfig;
  roomTypes?: RoomTypeProfile[];
  rates: {
    categories: CategoryRate[];
    seasons: Season[];
    packages: SpecialPackage[];
    promos: PromoCode[];
  };
  offers: Offer[];
  staff: StaffUser[];
  audit?: AuditEvent[];
};

export type OccupancyStay = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
};

export type PublicStayPayload = {
  hasVault: boolean;
  rooms: RoomState[];
  occupancy: OccupancyStay[];
  blocks: RoomBlock[];
  saleCloses?: SaleClose[] | null;
  property: PropertyProfile | null;
  booking: BookingEngineConfig | null;
  rates: HotelVault["rates"] | null;
  offers: Offer[] | null;
  roomTypes?: RoomTypeProfile[] | null;
};

export type HotelMembershipRole = Extract<StaffRole, "admin" | "recepcionista">;

export type HotelVaultPull = {
  payload: string;
  role: HotelMembershipRole;
};
