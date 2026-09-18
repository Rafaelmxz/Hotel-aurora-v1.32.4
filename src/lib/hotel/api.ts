import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertValidEmail } from "@/lib/email";
import { VAULT_ID, type HotelMembershipRole, type HotelVault, type PublicStayPayload } from "./types";
import {
  isSiteBooking,
  mergeConsumos,
  mergePagamentos,
  mergeReservations,
  occupancyOf,
  parseVault,
  splitPublicPending,
} from "./parse";
import { appendWithoutOverbooking, assertValidPeriod, assertVaultTransition } from "./rules";
import { extraQuantity, normalizeExtras } from "@/features/direct-booking/bookingStore";
import type { Reservation } from "@/mocks/hotelData";
import { stayNights } from "@/mocks/hotelData";
import type { ConsumoItem, PagamentoItem } from "@/features/reservations/types/folio";
import { deliverMail } from "./deliverMail";
import {
  voucherMailHtml,
  voucherMailSubject,
  voucherMailText,
  type VoucherMailInput,
} from "./voucherMail";
import { STATUS_LABEL } from "@/features/reservations/status";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type PublicPendings = {
  reservations: Reservation[];
  deposits: PagamentoItem[];
  consumos: ConsumoItem[];
};

async function loadPendingReservations(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
): Promise<PublicPendings> {
  const rows = await sql<{ payload: string }>`
    select payload from hotel_public_pending where hotel_id = ${VAULT_ID}
  `;
  const reservations: Reservation[] = [];
  const deposits: PagamentoItem[] = [];
  const consumos: ConsumoItem[] = [];
  for (const row of rows) {
    try {
      const split = splitPublicPending(JSON.parse(row.payload) as unknown);
      if (!split) continue;
      reservations.push(split.reservation);
      if (split.deposit) deposits.push(split.deposit);
      consumos.push(...split.consumos);
    } catch {
      /* ignore malformed pending rows */
    }
  }
  return { reservations, deposits, consumos };
}

function siteSliceOf(vault: HotelVault | null, pendings: PublicPendings) {
  const fromVault = (vault?.reservations ?? []).filter(isSiteBooking);
  const reservations = mergeReservations(fromVault, pendings.reservations);
  const publicIds = new Set(reservations.map((row) => row.id));
  const fromVaultPays = (vault?.pagamentos ?? []).filter((item) => publicIds.has(item.reserva_id));
  const fromVaultConsumos = (vault?.consumos ?? []).filter((item) => publicIds.has(item.reserva_id));
  return {
    reservations,
    pagamentos: mergePagamentos(fromVaultPays, pendings.deposits),
    consumos: mergeConsumos(fromVaultConsumos, pendings.consumos),
  };
}

function protectSiteBookings(
  client: HotelVault,
  server: HotelVault | null,
  pendings: PublicPendings,
): HotelVault {
  const slice = siteSliceOf(server, pendings);
  return {
    ...client,
    reservations: mergeReservations(client.reservations, slice.reservations),
    pagamentos: mergePagamentos(client.pagamentos ?? [], slice.pagamentos),
    consumos: mergeConsumos(client.consumos ?? [], slice.consumos),
    savedAt: Date.now(),
  };
}

function absorbPendings(vault: HotelVault | null, pendings: PublicPendings): HotelVault | null {
  if (!vault) return null;
  return {
    ...vault,
    reservations: mergeReservations(vault.reservations, pendings.reservations),
    pagamentos: mergePagamentos(vault.pagamentos ?? [], pendings.deposits),
    consumos: mergeConsumos(vault.consumos ?? [], pendings.consumos),
  };
}

async function loadVault(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
): Promise<HotelVault | null> {
  const rows = await sql<{ payload: string }>`
    select payload from hotel_vault where id = ${VAULT_ID} limit 1
  `;
  return parseVault(rows[0]?.payload);
}

async function saveVault(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  vault: HotelVault,
) {
  const payload = JSON.stringify(vault);
  const existing = await sql<{ id: string }>`
    select id from hotel_vault where id = ${VAULT_ID} limit 1
  `;
  if (existing.length) {
    await sql`
      update hotel_vault
      set payload = ${payload}, updated_at = now()
      where id = ${VAULT_ID}
    `;
  } else {
    await sql`
      insert into hotel_vault (id, payload)
      values (${VAULT_ID}, ${payload})
    `;
  }
}

async function ensureMembership(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  userId: string,
): Promise<HotelMembershipRole> {
  const existing = await sql<{ role: string }>`
    select role from hotel_member
    where user_id = ${userId} and hotel_id = ${VAULT_ID}
    limit 1
  `;
  const current = existing[0]?.role;
  if (current === "admin" || current === "recepcionista") return current;

  const countRows = await sql<{ n: number }>`
    select count(*)::int as n from hotel_member where hotel_id = ${VAULT_ID}
  `;
  const memberCount = Number(countRows[0]?.n ?? 0);
  const role: HotelMembershipRole = memberCount === 0 ? "admin" : "recepcionista";
  await sql`
    insert into hotel_member (user_id, hotel_id, role)
    values (${userId}, ${VAULT_ID}, ${role})
    on conflict (user_id, hotel_id) do nothing
  `;
  return role;
}

export const pullHotelVaultFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const role = await ensureMembership(sql, context.userId);
    const vault = await loadVault(sql);
    const pendings = await loadPendingReservations(sql);
    if (!vault) {
      if (!pendings.reservations.length) {
        return { payload: "", role };
      }
      const stub = {
        version: 1,
        savedAt: 0,
        reservations: pendings.reservations,
        pagamentos: pendings.deposits,
        rooms: [],
        consumos: pendings.consumos,
        guests: [],
        cashCloses: [],
      };
      return { payload: JSON.stringify(stub), role };
    }
    const merged = absorbPendings(vault, pendings)!;
    return { payload: JSON.stringify(merged), role };
  });

/** Fatia leve: pedidos do site (tabela + cofre). A recepção sempre une isto, mesmo se o cofre local for mais novo. */
export const pullPublicBookingsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensureMembership(sql, context.userId);
    const vault = await loadVault(sql);
    const pendings = await loadPendingReservations(sql);
    return siteSliceOf(vault, pendings);
  });

export const pushHotelVaultFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ payload: z.string().min(2) }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensureMembership(sql, context.userId);
    const vault = parseVault(data.payload);
    if (!vault) throw new Error("Cofre inválido");
    const current = await loadVault(sql);
    const pendings = await loadPendingReservations(sql);
    const merged = protectSiteBookings(vault, current, pendings);
    assertVaultTransition(current, merged);
    await saveVault(sql, merged);
    if (pendings.reservations.length) {
      const kept = new Set(merged.reservations.map((row) => row.id));
      for (const row of pendings.reservations) {
        if (!kept.has(row.id)) continue;
        await sql`delete from hotel_public_pending where id = ${row.id}`;
      }
    }
    return { ok: true as const };
  });

export const pullPublicStayFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const vault = await loadVault(sql);
  const pendings = await loadPendingReservations(sql);
  const occupancy = occupancyOf(
    appendWithoutOverbooking(vault?.reservations ?? [], pendings.reservations),
  );
  const payload: PublicStayPayload = {
    hasVault: Boolean(vault),
    rooms: vault?.rooms ?? [],
    occupancy,
    property: vault?.property ?? null,
    booking: vault?.booking ?? null,
    rates: vault?.rates ?? null,
    offers: vault?.offers ?? null,
  };
  return payload;
});

const publicBookingSchema = z.object({
  id: z.string().min(3).max(80),
  roomId: z.string().min(1).max(80),
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().min(3).max(160),
  checkIn: z.string().regex(ISO_DATE),
  checkOut: z.string().regex(ISO_DATE),
  guests: z.number().int().min(1).max(8).optional(),
  nightlyRate: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
  status: z.enum(["pendente", "confirmada"]).optional(),
  deposit: z
    .object({
      id: z.string().min(3).max(80),
      valor: z.number().positive(),
      metodo: z.enum(["pix", "cartao_credito", "cartao_debito", "dinheiro"]),
      descricao: z.string().max(200),
      observacao: z.string().max(300).optional(),
      data_pagamento: z.string().regex(ISO_DATE).optional(),
    })
    .optional(),
  extras: z
    .array(
      z.object({
        id: z.string().min(3).max(80),
        descricao: z.string().min(2).max(120),
        valor: z.number().nonnegative(),
        quantidade: z.number().int().min(1).max(20),
      }),
    )
    .max(8)
    .optional(),
});

async function enqueueVoucher(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  input: VoucherMailInput,
) {
  const to = assertValidEmail(input.to);
  const mail = { ...input, to };
  const subject = voucherMailSubject(mail);
  const html = voucherMailHtml(mail);
  const text = voucherMailText(mail);
  const recent = await sql<{ id: string }>`
    select id from hotel_email_outbox
    where hotel_id = ${VAULT_ID}
      and reservation_id = ${mail.reservationId}
      and to_email = ${to}
      and created_at > now() - interval '45 seconds'
    limit 1
  `;
  if (recent.length) {
    return { emailed: true as const, to, channel: "caixa" as const, delivered: false };
  }
  const delivery = await deliverMail({ to, subject, html, text });
  const id = `mail-${mail.reservationId}-${Date.now()}`;
  await sql`
    insert into hotel_email_outbox (
      id, hotel_id, reservation_id, to_email, subject, html, text_body, delivered, channel
    ) values (
      ${id}, ${VAULT_ID}, ${mail.reservationId}, ${to}, ${subject}, ${html}, ${text},
      ${delivery.delivered}, ${delivery.channel}
    )
  `;
  return {
    emailed: true as const,
    to,
    channel: delivery.channel,
    delivered: delivery.delivered,
  };
}

function voucherHeading(status: Reservation["status"]) {
  return status === "pendente" ? "Pré-reserva" : "Comprovante de reserva";
}

export const submitPublicBookingFn = createServerFn({ method: "POST" })
  .validator(publicBookingSchema)
  .handler(async ({ data }) => {
    assertValidPeriod(data.checkIn, data.checkOut);
    const email = assertValidEmail(data.guestEmail);
    const { getSql } = await import("@/lib/db");
    const { assertNoOverbooking } = await import("@/features/reservations/overbooking");
    const { rooms } = await import("@/mocks/hotelData");
    const sql = await getSql();
    const vault = await loadVault(sql);
    const pendings = await loadPendingReservations(sql);
    const roomList = vault?.rooms?.length ? vault.rooms : rooms;
    if (!roomList.some((room) => room.id === data.roomId)) {
      throw new Error("Quarto não encontrado");
    }
    const known = mergeReservations(vault?.reservations ?? [], pendings.reservations);
    assertNoOverbooking(known, {
      roomId: data.roomId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
    });
    const duplicate = known.find((row) => row.id === data.id);
    if (duplicate) {
      const sameStay =
        duplicate.guestEmail === email &&
        duplicate.roomId === data.roomId &&
        duplicate.checkIn === data.checkIn &&
        duplicate.checkOut === data.checkOut;
      if (sameStay) {
        return {
          ok: true as const,
          id: duplicate.id,
          status: duplicate.status,
          emailed: false,
          emailTo: email,
        };
      }
      throw new Error("Esta reserva não pôde ser gravada. Atualize a página e tente de novo.");
    }
    const autoConfirm = data.status === "confirmada" && Boolean(data.deposit);
    const reservation: Reservation = {
      id: data.id,
      roomId: data.roomId,
      guestName: data.guestName.trim(),
      guestEmail: email,
      guests: data.guests ?? 1,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      status: autoConfirm ? "confirmada" : "pendente",
      nightlyRate: data.nightlyRate,
      totalAmount: data.totalAmount,
      origin: "Link público",
      createdAt: new Date().toISOString().slice(0, 10),
      notes: data.notes,
    };
    const deposit: PagamentoItem | undefined =
      autoConfirm && data.deposit
        ? {
            id: data.deposit.id,
            reserva_id: reservation.id,
            descricao: data.deposit.descricao,
            valor: data.deposit.valor,
            data_pagamento: data.deposit.data_pagamento ?? new Date().toISOString().slice(0, 10),
            metodo: data.deposit.metodo,
            observacao: data.deposit.observacao,
          }
        : undefined;
    const catalog = normalizeExtras(vault?.booking?.extras);
    const nights = stayNights(reservation.checkIn, reservation.checkOut);
    const guests = reservation.guests;
    const picked = new Set((data.extras ?? []).map((line) => line.id));
    const extraLines: ConsumoItem[] = catalog
      .filter((item) => item.enabled && picked.has(item.id) && item.price >= 0)
      .map((item) => ({
        id: `csm-extra-${item.id}-${reservation.id}`,
        reserva_id: reservation.id,
        descricao: item.name,
        valor: item.price,
        quantidade: extraQuantity(item, nights, guests),
        data_lancamento: new Date().toISOString().slice(0, 10),
      }));
    const extrasTotal = extraLines.reduce((sum, item) => sum + item.valor * item.quantidade, 0);
    const existing = await sql<{ id: string }>`
      select id from hotel_public_pending where id = ${reservation.id} limit 1
    `;
    if (!existing.length) {
      const payload = {
        ...reservation,
        ...(deposit ? { deposit } : {}),
        ...(extraLines.length ? { consumos: extraLines } : {}),
      };
      await sql`
        insert into hotel_public_pending (id, hotel_id, payload)
        values (${reservation.id}, ${VAULT_ID}, ${JSON.stringify(payload)})
      `;
    }
    if (vault) {
      await saveVault(sql, {
        ...vault,
        reservations: mergeReservations(vault.reservations, [reservation]),
        pagamentos: mergePagamentos(vault.pagamentos ?? [], deposit ? [deposit] : []),
        consumos: mergeConsumos(vault.consumos ?? [], extraLines),
        savedAt: Date.now(),
      });
    }
    let emailed: { emailed: true; to: string; channel: "caixa" | "resend"; delivered: boolean } | {
      emailed: false;
    } = { emailed: false };
    try {
      const room = roomList.find((item) => item.id === reservation.roomId);
      const property = vault?.property;
      const booking = vault?.booking;
      const paid = deposit?.valor ?? 0;
      emailed = await enqueueVoucher(sql, {
        to: email,
        hotelName: property?.name ?? "Hotel Aurora",
        address: property?.address ?? "",
        phone: property?.phone ?? "",
        checkInTime: booking?.checkInTime ?? property?.checkInTime ?? "14:00",
        checkOutTime: booking?.checkOutTime ?? property?.checkOutTime ?? "12:00",
        cancellationPolicy: booking?.cancellationPolicy ?? "Cancelamento conforme política da casa.",
        reservationId: reservation.id,
        heading: voucherHeading(reservation.status),
        guestName: reservation.guestName,
        roomLabel: room ? `Quarto ${room.number} · ${room.type}` : reservation.roomId,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        statusLabel: STATUS_LABEL[reservation.status],
        totalDiarias: reservation.totalAmount,
        totalConsumo: extrasTotal,
        totalPagamentos: paid,
        saldo: Math.max(0, reservation.totalAmount + extrasTotal - paid),
      });
    } catch {
      emailed = { emailed: false };
    }
    return {
      ok: true as const,
      id: reservation.id,
      status: reservation.status,
      emailed: emailed.emailed,
      emailTo: emailed.emailed ? emailed.to : email,
    };
  });

const sendVoucherSchema = z.object({
  to: z.string().min(3).max(160),
  reservationId: z.string().min(3).max(80),
  heading: z.string().max(80).optional(),
  guestName: z.string().min(1).max(120),
  roomLabel: z.string().min(1).max(120),
  checkIn: z.string().regex(ISO_DATE),
  checkOut: z.string().regex(ISO_DATE),
  statusLabel: z.string().min(1).max(40),
  hotelName: z.string().min(1).max(120),
  address: z.string().max(240),
  phone: z.string().max(40),
  checkInTime: z.string().max(12),
  checkOutTime: z.string().max(12),
  cancellationPolicy: z.string().max(400),
  totalDiarias: z.number().nonnegative(),
  totalConsumo: z.number().nonnegative(),
  totalPagamentos: z.number().nonnegative(),
  saldo: z.number(),
});

export const sendVoucherEmailFn = createServerFn({ method: "POST" })
  .validator(sendVoucherSchema)
  .handler(async ({ data }) => {
    const to = assertValidEmail(data.to);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const vault = await loadVault(sql);
    const pendings = await loadPendingReservations(sql);
    const known = mergeReservations(vault?.reservations ?? [], pendings.reservations);
    const stay = known.find((row) => row.id === data.reservationId);
    if (!stay) {
      throw new Error("Reserva não encontrada para enviar o voucher.");
    }
    const staff = await import("@/lib/auth/verify.server")
      .then((mod) => mod.getSessionUser())
      .catch(() => null);
    if (!staff && to !== stay.guestEmail) {
      throw new Error("Só a recepção pode enviar o voucher para outro e-mail.");
    }
    return enqueueVoucher(sql, {
      ...data,
      to,
      reservationId: data.reservationId,
      heading: data.heading ?? voucherHeading(stay.status),
    });
  });

export const listVoucherEmailsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensureMembership(sql, context.userId);
    const rows = await sql<{
      id: string;
      reservation_id: string;
      to_email: string;
      subject: string;
      html: string;
      delivered: boolean;
      channel: string;
      created_at: string;
    }>`
      select id, reservation_id, to_email, subject, html, delivered, channel,
             created_at::text as created_at
      from hotel_email_outbox
      where hotel_id = ${VAULT_ID}
      order by created_at desc
      limit 40
    `;
    return rows;
  });
