import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TODAY_ISO,
  formatCurrency,
  roomById,
  stayNights,
  type Reservation,
  type ReservationStatus,
  type RoomType,
} from "@/mocks/hotelData";
import { listGuests } from "@/features/guests/guestStore";
import { getFolio, listAllPagamentos } from "./folioStore";
import { STATUS_BADGE, STATUS_LABEL } from "./status";
import { usePatchReservation, useReservations } from "./useReservations";

type DateField = "checkIn" | "checkOut" | "createdAt";
type StatusFilter = ReservationStatus | "todas" | "no-show";
type PayLabel = "Pago" | "Parcial" | "Pendente";

const PAGE_SIZE = 10;
const ROOM_TYPES: Array<RoomType | "todas"> = ["todas", "Standard", "Luxo", "Suíte"];
const STATUSES: StatusFilter[] = [
  "todas",
  "confirmada",
  "pendente",
  "cancelada",
  "no-show",
  "check-in",
  "check-out",
];
const BULK_STATUSES: ReservationStatus[] = [
  "pendente",
  "confirmada",
  "check-in",
  "check-out",
  "cancelada",
];

function createdAtOf(row: Reservation) {
  return row.createdAt ?? row.checkIn;
}

function isNoShow(row: Reservation) {
  return row.status === "confirmada" && row.checkIn < TODAY_ISO && !row.actualCheckInAt;
}

function paymentOf(row: Reservation): { paid: number; saldo: number; label: PayLabel } {
  const folio = getFolio(row.id);
  const paid = folio.totais.totalPagamentos;
  const saldo = folio.totais.saldo;
  const label: PayLabel = paid <= 0 ? "Pendente" : saldo <= 0 ? "Pago" : "Parcial";
  return { paid, saldo, label };
}

function exportCsv(rows: Reservation[]) {
  const header = [
    "codigo",
    "hospede",
    "quarto",
    "check_in",
    "check_out",
    "noites",
    "total",
    "pagamento",
    "status",
    "origem",
  ];
  const lines = rows.map((row) => {
    const room = roomById(row.roomId);
    const pay = paymentOf(row);
    return [
      row.id,
      row.guestName,
      room?.number ?? row.roomId,
      row.checkIn,
      row.checkOut,
      stayNights(row.checkIn, row.checkOut),
      row.totalAmount,
      pay.label,
      isNoShow(row) ? "no-show" : row.status,
      row.origin,
    ].join(";");
  });
  const blob = new Blob([[header.join(";"), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reservas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function BookingListView() {
  const { data: reservations = [] } = useReservations();
  const patch = usePatchReservation();
  const guests = listGuests();
  const origins = useMemo(
    () => ["todas", ...[...new Set(reservations.map((row) => row.origin))].sort()],
    [reservations],
  );

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [dateField, setDateField] = useState<DateField>("checkIn");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [roomType, setRoomType] = useState<RoomType | "todas">("todas");
  const [origin, setOrigin] = useState("todas");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ReservationStatus>("confirmada");

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return reservations.filter((row) => {
      const room = roomById(row.roomId);
      const guest = guests.find((item) => item.name === row.guestName);
      if (q) {
        const hay = `${row.id} ${row.guestName} ${guest?.cpf ?? ""} ${row.guestEmail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status === "no-show") {
        if (!isNoShow(row)) return false;
      } else if (status !== "todas" && row.status !== status) {
        return false;
      }
      if (roomType !== "todas" && room?.type !== roomType) return false;
      if (origin !== "todas" && row.origin !== origin) return false;
      const dateValue =
        dateField === "checkOut" ? row.checkOut : dateField === "createdAt" ? createdAtOf(row) : row.checkIn;
      if (from && dateValue < from) return false;
      if (to && dateValue > to) return false;
      return true;
    });
  }, [reservations, guests, keyword, status, roomType, origin, dateField, from, to]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [keyword, status, roomType, origin, dateField, from, to]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const paged = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allOnPageSelected = paged.length > 0 && paged.every((row) => selected.includes(row.id));
  const payments = listAllPagamentos();
  const totals = rows.reduce(
    (acc, row) => {
      acc.amount += row.totalAmount;
      acc.paid += payments
        .filter((item) => item.reserva_id === row.id)
        .reduce((sum, item) => sum + item.valor, 0);
      return acc;
    },
    { amount: 0, paid: 0 },
  );

  function toggleAll() {
    if (allOnPageSelected) {
      setSelected((current) => current.filter((id) => !paged.some((row) => row.id === id)));
      return;
    }
    setSelected((current) => [...new Set([...current, ...paged.map((row) => row.id)])]);
  }

  function toggleOne(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function applyBulk() {
    if (selected.length === 0) {
      toast.error("Selecione ao menos uma reserva.");
      return;
    }
    try {
      for (const id of selected) {
        await patch.mutateAsync({ id, status: bulkStatus });
      }
      toast.success(`${selected.length} reserva(s) → ${STATUS_LABEL[bulkStatus]}`);
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status em massa.");
    }
  }

  const fromItem = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(currentPage * PAGE_SIZE, rows.length);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recepção
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">Reservas</h1>
        </div>
        <Input
          className="max-w-sm"
          placeholder="Busca rápida: hóspede, CPF ou código"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </header>

      <div className="rounded-xl bg-card shadow-[var(--shadow-border)]">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filtros avançados
          <span className="text-xs text-muted-foreground">{filtersOpen ? "Recolher" : "Expandir"}</span>
        </button>
        {filtersOpen ? (
          <div className="grid gap-3 border-t border-border px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label>Intervalo por</Label>
              <select
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={dateField}
                onChange={(event) => setDateField(event.target.value as DateField)}
              >
                <option value="checkIn">Check-in</option>
                <option value="checkOut">Check-out</option>
                <option value="createdAt">Data de criação</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>De</Label>
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item === "todas" ? "Todas" : item === "no-show" ? "No-show" : STATUS_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Tipo de acomodação</Label>
              <select
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={roomType}
                onChange={(event) => setRoomType(event.target.value as RoomType | "todas")}
              >
                {ROOM_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item === "todas" ? "Todas" : item}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label>Origem / canal (UTM)</Label>
              <select
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              >
                {origins.map((item) => (
                  <option key={item} value={item}>
                    {item === "todas" ? "Todas" : item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]">
        <span className="text-sm text-muted-foreground">{selected.length} selecionada(s)</span>
        <select
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          value={bulkStatus}
          onChange={(event) => setBulkStatus(event.target.value as ReservationStatus)}
        >
          {BULK_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABEL[item]}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => void applyBulk()} disabled={patch.isPending}>
          Alterar status
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const pack = reservations.filter((row) => selected.includes(row.id));
            if (pack.length === 0) {
              toast.error("Selecione reservas para exportar.");
              return;
            }
            exportCsv(pack);
            toast.success("CSV exportado");
          }}
        >
          Exportar selecionados
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-3">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} aria-label="Selecionar página" />
              </th>
              <th className="px-3 py-3 font-medium">Código</th>
              <th className="px-3 py-3 font-medium">Hóspede</th>
              <th className="px-3 py-3 font-medium">Quarto</th>
              <th className="px-3 py-3 font-medium">Check-in / Out</th>
              <th className="px-3 py-3 font-medium">Noites</th>
              <th className="px-3 py-3 font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Pagamento</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Origem</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const room = roomById(row.roomId);
              const pay = paymentOf(row);
              const noShow = isNoShow(row);
              return (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Selecionar ${row.id}`}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium">
                    <Link to="/calendario" search={{ reserva: row.id }} className="underline underline-offset-2">
                      {row.id}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link to="/calendario" search={{ reserva: row.id }} className="underline underline-offset-2">
                      {row.guestName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{room ? `${room.number} · ${room.type}` : row.roomId}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.checkIn} → {row.checkOut}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{stayNights(row.checkIn, row.checkOut)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        pay.label === "Pago" ? "checkout" : pay.label === "Parcial" ? "pending" : "cancelled"
                      }
                    >
                      {pay.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={noShow ? "cancelled" : STATUS_BADGE[row.status]}>
                      {noShow ? "No-show" : STATUS_LABEL[row.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.origin}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Mostrando {fromItem}–{toItem} de {rows.length} · Total {formatCurrency(totals.amount)} ·
            Recebido {formatCurrency(totals.paid)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </Button>
            <span className="tabular-nums">
              {currentPage} / {pages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={currentPage >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
