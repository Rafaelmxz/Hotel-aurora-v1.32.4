import { useState } from "react";
import { Mail, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatCurrency,
  formatStayRange,
  stayNights,
  type Reservation,
} from "@/mocks/hotelData";
import { STATUS_LABEL } from "../status";
import type { FolioTotais } from "../types/folio";
import { locatorOf } from "@/lib/hotel/voucherMail";

export { locatorOf };

export function StayVoucher({
  reservation,
  roomLabel,
  hotelName,
  address,
  phone,
  checkInTime,
  checkOutTime,
  cancellationPolicy,
  totais,
  heading,
  emailedTo,
}: {
  reservation: Reservation;
  roomLabel: string;
  hotelName: string;
  address: string;
  phone: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  totais: FolioTotais;
  heading?: string;
  emailedTo?: string;
}) {
  const nights = stayNights(reservation.checkIn, reservation.checkOut);
  const title =
    heading ??
    (reservation.status === "pendente" ? "Pré-reserva" : "Comprovante de reserva");
  const [to, setTo] = useState(reservation.guestEmail);
  const [sentTo, setSentTo] = useState(emailedTo ?? "");
  const [busy, setBusy] = useState(false);

  async function sendEmail() {
    setBusy(true);
    try {
      const { sendVoucherEmailFn } = await import("@/lib/hotel/api");
      const result = await sendVoucherEmailFn({
        data: {
          to,
          reservationId: reservation.id,
          heading: title,
          guestName: reservation.guestName,
          roomLabel,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          statusLabel: STATUS_LABEL[reservation.status],
          hotelName,
          address,
          phone,
          checkInTime,
          checkOutTime,
          cancellationPolicy,
          totalDiarias: totais.totalDiarias,
          totalConsumo: totais.totalConsumo,
          totalPagamentos: totais.totalPagamentos,
          saldo: totais.saldo,
        },
      });
      setSentTo(result.to);
      toast.success(
        result.delivered
          ? `Voucher enviado para ${result.to}.`
          : `Voucher na caixa do hotel para ${result.to}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="stay-voucher rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {hotelName}
      </p>
      <h2 className="font-display mt-1 text-2xl font-medium tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Localizador <span className="font-medium text-foreground">{locatorOf(reservation.id)}</span>
        {" · "}
        {STATUS_LABEL[reservation.status]}
      </p>
      {sentTo ? (
        <p className="mt-2 text-sm text-emerald-800">Enviado para {sentTo}.</p>
      ) : null}

      <dl className="mt-5 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Hóspede</dt>
          <dd className="text-right font-medium">{reservation.guestName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">E-mail</dt>
          <dd className="text-right">{reservation.guestEmail}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Quarto</dt>
          <dd className="text-right">{roomLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Estadia</dt>
          <dd className="text-right">
            {formatStayRange(reservation.checkIn, reservation.checkOut)}
            {` · ${nights} ${nights === 1 ? "noite" : "noites"}`}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Horários</dt>
          <dd className="text-right">
            Check-in {checkInTime} · Check-out {checkOutTime}
          </dd>
        </div>
      </dl>

      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-sm">
        <dt className="text-muted-foreground">Diárias</dt>
        <dd className="text-right tabular-nums">{formatCurrency(totais.totalDiarias)}</dd>
        {totais.totalConsumo > 0 ? (
          <>
            <dt className="text-muted-foreground">Consumo</dt>
            <dd className="text-right tabular-nums">{formatCurrency(totais.totalConsumo)}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Pagamentos</dt>
        <dd className="text-right tabular-nums">− {formatCurrency(totais.totalPagamentos)}</dd>
        <dt className="font-medium">Saldo</dt>
        <dd className="text-right font-medium tabular-nums">{formatCurrency(totais.saldo)}</dd>
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">{cancellationPolicy}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {address}
        {phone ? ` · ${phone}` : ""}
      </p>

      <div className="no-print mt-5 grid gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`voucher-email-${reservation.id}`} className="text-xs">
            Enviar por e-mail
          </Label>
          <Input
            id={`voucher-email-${reservation.id}`}
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <Button type="button" className="w-full" disabled={busy} onClick={() => void sendEmail()}>
          <Mail className="size-4" />
          {busy ? "Enviando…" : sentTo ? "Reenviar voucher" : "Enviar voucher por e-mail"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimir voucher
        </Button>
      </div>
    </article>
  );
}
