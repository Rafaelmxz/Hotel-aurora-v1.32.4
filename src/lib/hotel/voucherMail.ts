import {
  formatCurrency,
  formatStayRange,
  stayNights,
} from "@/mocks/hotelData";

export function locatorOf(reservationId: string) {
  return reservationId.replace(/^res-/, "AUR-").toUpperCase();
}

export type VoucherMailInput = {
  to: string;
  hotelName: string;
  address: string;
  phone: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  reservationId: string;
  heading: string;
  guestName: string;
  roomLabel: string;
  checkIn: string;
  checkOut: string;
  statusLabel: string;
  totalDiarias: number;
  totalConsumo: number;
  totalPagamentos: number;
  saldo: number;
};

function esc(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function row(label: string, value: string) {
  return (
    "<tr>" +
    '<td style="padding:6px 0;color:#64748b;font-size:14px">' +
    esc(label) +
    "</td>" +
    '<td style="padding:6px 0;text-align:right;font-size:14px;color:#0f172a">' +
    value +
    "</td>" +
    "</tr>"
  );
}

export function voucherMailSubject(input: VoucherMailInput) {
  return `${input.heading} ${locatorOf(input.reservationId)} · ${input.hotelName}`;
}

export function voucherMailText(input: VoucherMailInput) {
  const nights = stayNights(input.checkIn, input.checkOut);
  const lines = [
    input.hotelName,
    input.heading,
    `Localizador ${locatorOf(input.reservationId)} · ${input.statusLabel}`,
    `Hóspede: ${input.guestName}`,
    `E-mail: ${input.to}`,
    `Quarto: ${input.roomLabel}`,
    `Estadia: ${formatStayRange(input.checkIn, input.checkOut)} · ${nights} ${nights === 1 ? "noite" : "noites"}`,
    `Horários: check-in ${input.checkInTime} · check-out ${input.checkOutTime}`,
    `Diárias: ${formatCurrency(input.totalDiarias)}`,
  ];
  if (input.totalConsumo > 0) {
    lines.push(`Consumo: ${formatCurrency(input.totalConsumo)}`);
  }
  lines.push(
    `Pagamentos: - ${formatCurrency(input.totalPagamentos)}`,
    `Saldo: ${formatCurrency(input.saldo)}`,
    input.cancellationPolicy,
    [input.address, input.phone].filter(Boolean).join(" · "),
  );
  return lines.join("\n");
}

export function voucherMailHtml(input: VoucherMailInput) {
  const nights = stayNights(input.checkIn, input.checkOut);
  const nightLabel = `${nights} ${nights === 1 ? "noite" : "noites"}`;
  const stay = `${esc(formatStayRange(input.checkIn, input.checkOut))} · ${esc(nightLabel)}`;
  const consumo =
    input.totalConsumo > 0 ? row("Consumo", esc(formatCurrency(input.totalConsumo))) : "";
  return [
    '<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Georgia,serif;color:#0f172a">',
    '<div style="max-width:520px;margin:24px auto;background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:12px">',
    '<p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">',
    esc(input.hotelName),
    "</p>",
    '<h1 style="margin:8px 0 4px;font-size:26px;font-weight:500">',
    esc(input.heading),
    "</h1>",
    '<p style="margin:0 0 16px;font-size:14px;color:#64748b">Localizador <strong style="color:#0f172a">',
    esc(locatorOf(input.reservationId)),
    "</strong> · ",
    esc(input.statusLabel),
    "</p><table style=\"width:100%;border-collapse:collapse\">",
    row("Hóspede", esc(input.guestName)),
    row("E-mail", esc(input.to)),
    row("Quarto", esc(input.roomLabel)),
    row("Estadia", stay),
    row("Horários", esc(`Check-in ${input.checkInTime} · Check-out ${input.checkOutTime}`)),
    "</table>",
    '<table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #e2e8f0">',
    row("Diárias", esc(formatCurrency(input.totalDiarias))),
    consumo,
    row("Pagamentos", "- " + esc(formatCurrency(input.totalPagamentos))),
    row("Saldo", "<strong>" + esc(formatCurrency(input.saldo)) + "</strong>"),
    "</table>",
    '<p style="margin:16px 0 0;font-size:12px;color:#64748b">',
    esc(input.cancellationPolicy),
    "</p>",
    '<p style="margin:8px 0 0;font-size:12px;color:#64748b">',
    esc([input.address, input.phone].filter(Boolean).join(" · ")),
    "</p></div></body></html>",
  ].join("");
}
