import { listReservations } from "@/features/reservations/reservationStore";
import { getFolio } from "@/features/reservations/folioStore";
import type { FolioResumo } from "@/features/reservations/types/folio";
import type { Reservation } from "@/mocks/hotelData";

export const guestKeys = {
  all: ["guests"] as const,
  byId: (id: string) => ["guests", id] as const,
};

export type GuestTag = "VIP" | "Corporativo" | "Inadimplente" | "Frequente";

export type Guest = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  preferences: string[];
  tags: GuestTag[];
  notes?: string;
};

type GuestSeed = Partial<Omit<Guest, "id" | "name" | "email">> & { name: string };

const PROFILE_SEED: GuestSeed[] = [
  {
    name: "Ana Ribeiro",
    tags: ["VIP", "Frequente"],
    preferences: ["Andar alto", "Cortesia no frigobar"],
    notes: "Hóspede fiel. Tratar como VIP na recepção.",
  },
  {
    name: "Bruno Costa",
    tags: ["Corporativo"],
    preferences: ["Andar alto", "Check-in tardio"],
  },
  {
    name: "Camila Ferreira",
    tags: ["Frequente"],
    preferences: ["Alérgica a mofo", "Travesseiro extra"],
  },
  {
    name: "Diego Almeida",
    tags: ["Inadimplente"],
    preferences: ["Evitar pré-autorização baixa"],
    notes: "Histórico de saldo em aberto. Confirmar pagamento no check-in.",
  },
  {
    name: "Helena Paiva",
    tags: ["VIP"],
    preferences: ["Suíte se disponível", "Silêncio"],
  },
];

function slugName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fakeCpf(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const body = String(hash).padStart(9, "0").slice(0, 9);
  return `${body.slice(0, 3)}.${body.slice(3, 6)}.${body.slice(6, 9)}-${String(hash % 100).padStart(2, "0")}`;
}

function fakePhone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 17 + char.charCodeAt(0)) >>> 0;
  return `(11) 9${String(hash).padStart(8, "0").slice(0, 4)}-${String(hash).slice(-4)}`;
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function guestIdFromName(name: string) {
  return `gst-${slugName(name)}`;
}

function fromReservation(reservation: Reservation, extra?: GuestSeed): Guest {
  return {
    id: guestIdFromName(reservation.guestName),
    name: reservation.guestName,
    email: reservation.guestEmail,
    cpf: extra?.cpf ?? fakeCpf(reservation.guestName),
    phone: extra?.phone ?? fakePhone(reservation.guestName),
    preferences: extra?.preferences ?? [],
    tags: extra?.tags ?? [],
    notes: extra?.notes,
  };
}

export function listGuests(): Guest[] {
  const extras = new Map(PROFILE_SEED.map((row) => [row.name, row]));
  const byName = new Map<string, Guest>();
  for (const reservation of listReservations()) {
    if (byName.has(reservation.guestName)) continue;
    byName.set(
      reservation.guestName,
      fromReservation(reservation, extras.get(reservation.guestName)),
    );
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function getGuest(id: string): Guest | undefined {
  return listGuests().find((guest) => guest.id === id);
}

export function findGuestByName(name: string): Guest | undefined {
  return listGuests().find((guest) => guest.name === name);
}

export function searchGuests(query: string): Guest[] {
  const term = query.trim().toLowerCase();
  const termDigits = digits(query);
  if (!term) return listGuests().slice(0, 8);
  return listGuests()
    .filter((guest) => {
      const hay = `${guest.name} ${guest.email} ${guest.cpf}`.toLowerCase();
      if (hay.includes(term)) return true;
      return termDigits.length >= 3 && digits(guest.cpf).includes(termDigits);
    })
    .slice(0, 8);
}

export type GuestStayHistory = {
  reservation: Reservation;
  roomNumber?: string;
  consumo: number;
  pagos: number;
  folio: FolioResumo;
};

export type GuestStats = {
  guest: Guest;
  stays: GuestStayHistory[];
  ltv: number;
  stayCount: number;
};

export function getGuestStats(guest: Guest): GuestStats {
  const reservations = listReservations().filter(
    (row) => row.guestName === guest.name && row.status !== "cancelada",
  );
  const stays: GuestStayHistory[] = reservations
    .slice()
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
    .map((reservation) => {
      const folio = getFolio(reservation.id);
      return {
        reservation,
        consumo: folio.totais.totalConsumo,
        pagos: folio.totais.totalPagamentos,
        folio,
      };
    });
  const ltv = stays.reduce(
    (sum, stay) => sum + stay.reservation.totalAmount + stay.consumo,
    0,
  );
  return { guest, stays, ltv, stayCount: stays.length };
}
