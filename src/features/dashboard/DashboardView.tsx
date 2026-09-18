import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LogIn,
  LogOut,
  Percent,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TODAY,
  TODAY_ISO,
  formatCurrency,
  type Reservation,
} from "@/mocks/hotelData";
import { cn } from "@/lib/utils";
import { PendingBookingsAlert } from "@/features/direct-booking/PendingBookingsAlert";
import { CreateReservationModal } from "@/features/reservations/CreateReservationModal";
import { STATUS_BADGE, STATUS_LABEL } from "@/features/reservations/status";
import { AnnualChart } from "./AnnualChart";
import {
  reservationCode,
  reservationRoomLabel,
  useDashboardData,
  type DayTab,
} from "./useDashboardData";
import { useCan } from "@/features/users/useStaff";

const TABS: Array<{ id: DayTab; label: string }> = [
  { id: "chegadas", label: "Chegadas" },
  { id: "saidas", label: "Saídas" },
  { id: "permanencias", label: "Permanências" },
  { id: "casa", label: "Na casa" },
];

type ActivityTab = "vendas" | "cancelamentos" | "alertas";

function isoFrom(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDayTitle(date: Date) {
  const raw = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function matchesQuery(row: Reservation, query: string) {
  if (!query) return true;
  const hay = `${row.guestName} ${row.guestEmail} ${row.id} ${reservationCode(row)} ${reservationRoomLabel(row)}`.toLowerCase();
  return hay.includes(query);
}

function ReservationRow({
  row,
  extra,
}: {
  row: Reservation;
  extra?: string;
}) {
  return (
    <li className="grid gap-2 border-t border-border px-4 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <Link
          to="/calendario"
          search={{ reserva: row.id }}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.guestName}
        </Link>
        <p className="text-xs text-muted-foreground sm:hidden">
          {reservationRoomLabel(row)} · {row.checkIn} → {row.checkOut}
        </p>
      </div>
      <p className="hidden font-mono text-xs tracking-wide text-muted-foreground sm:block">
        {reservationCode(row)}
      </p>
      <p className="hidden truncate text-sm text-muted-foreground sm:block">
        {reservationRoomLabel(row)}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        {extra ? <span className="text-sm tabular-nums">{extra}</span> : null}
        <Badge variant={STATUS_BADGE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" asChild>
          <Link to="/calendario" search={{ reserva: row.id }} aria-label={`Abrir ficha de ${row.guestName}`}>
            <FileText className="size-4" />
          </Link>
        </Button>
      </div>
    </li>
  );
}

export function DashboardView() {
  const canReports = useCan("reports");
  const [viewDate, setViewDate] = useState(TODAY);
  const [tab, setTab] = useState<DayTab>("chegadas");
  const [activity, setActivity] = useState<ActivityTab>("vendas");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const dayIso = isoFrom(viewDate);
  const data = useDashboardData(dayIso);
  const isToday = dayIso === TODAY_ISO;
  const q = query.trim().toLowerCase();

  const lists: Record<DayTab, Reservation[]> = {
    chegadas: data.chegadas,
    saidas: data.saidas,
    permanencias: data.permanencias,
    casa: data.casa,
  };
  const current = useMemo(
    () => lists[tab].filter((row) => matchesQuery(row, q)),
    [lists, tab, q],
  );

  const kpis = [
    {
      label: "Chegadas",
      value: String(data.chegadas.length),
      hint:
        data.remainingArrivals.length === 1
          ? "1 ainda sem check-in"
          : `${data.remainingArrivals.length} ainda sem check-in`,
      icon: LogIn,
    },
    {
      label: "Saídas",
      value: String(data.saidas.length),
      hint:
        data.remainingDepartures.length === 1
          ? "1 ainda na casa"
          : `${data.remainingDepartures.length} ainda na casa`,
      icon: LogOut,
    },
    {
      label: "Ocupação",
      value: `${data.occupancyPct}%`,
      hint: `${data.occupiedTonight} de ${data.totalRooms} quartos ocupados`,
      icon: Percent,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Dia anterior"
            onClick={() => setViewDate((d) => addDays(d, -1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {isToday ? "Hoje" : "Dia selecionado"}
            </p>
            <h1 className="font-display text-xl font-medium tracking-tight sm:text-3xl">
              {formatDayTitle(viewDate)}
            </h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Próximo dia"
            onClick={() => setViewDate((d) => addDays(d, 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
          {!isToday ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setViewDate(TODAY)}>
              Hoje
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar hóspede, código ou quarto"
              className="pl-10"
              aria-label="Buscar reserva"
            />
          </label>
          <Button type="button" className="h-11 shrink-0 pl-4 pr-3.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Criar reserva
          </Button>
        </div>
      </header>

      <PendingBookingsAlert compact />

      <section className="grid gap-3 sm:grid-cols-3">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-xl bg-card px-5 py-4 shadow-[var(--shadow-border)] transition-shadow duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {card.label}
                </p>
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
              </div>
              <p className="font-display mt-2 text-3xl font-medium tabular-nums">{card.value}</p>
              <p className="mt-1 text-sm text-primary tabular-nums">{card.hint}</p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="px-1 text-sm font-medium">Reservas</h2>
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                    tab === item.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                  <span className="ml-1.5 tabular-nums text-xs text-primary">
                    {lists[item.id].length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="hidden grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)_auto] gap-2 px-4 pt-3 text-xs tracking-wide text-muted-foreground uppercase sm:grid">
            <span>Hóspede</span>
            <span>Cód.</span>
            <span>Quarto</span>
            <span className="text-right">Situação</span>
          </div>
          <ul>
            {current.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                {q ? "Nenhuma reserva corresponde à busca." : "Nenhum registro nesta lista."}
              </li>
            ) : (
              current.map((row) => <ReservationRow key={row.id} row={row} />)
            )}
          </ul>
        </section>

        <section className="h-fit overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Atividade do dia</h2>
            <p className="text-xs text-muted-foreground">Vendas, cancelamentos e alertas</p>
          </div>
          <div className="flex gap-1 px-2 pt-2">
            {(
              [
                ["vendas", "Vendas"],
                ["cancelamentos", "Cancelamentos"],
                ["alertas", "Alertas"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "h-11 flex-1 rounded-lg px-2 text-sm font-medium transition-colors duration-150",
                  activity === id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActivity(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="px-4 py-4">
            {activity === "vendas" ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Reservas</p>
                    <p className="font-display text-2xl font-medium tabular-nums">
                      {data.createdToday.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Noites</p>
                    <p className="font-display text-2xl font-medium tabular-nums">
                      {data.roomNightsToday}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Recebido</p>
                    <p className="font-display text-xl font-medium tabular-nums">
                      {formatCurrency(data.salesTotal)}
                    </p>
                  </div>
                </div>
                {data.salesToday.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento neste dia.</p>
                ) : (
                  <ul className="grid gap-2">
                    {data.salesToday.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{item.guestName}</span>
                        <span className="tabular-nums">{formatCurrency(item.valor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            {activity === "cancelamentos" ? (
              data.cancelamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cancelamento neste dia.</p>
              ) : (
                <ul className="grid gap-2">
                  {data.cancelamentos.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{row.guestName}</span>
                      <span className="text-muted-foreground">{reservationRoomLabel(row)}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            {activity === "alertas" ? (
              <div className="grid gap-2 text-sm">
                {data.preReservas.length ? (
                  <p>
                    {data.preReservas.length} pedido(s) do site ou pré-reserva(s) na recepção.{" "}
                    <Link to="/calendario" className="underline">
                      Abrir mapa
                    </Link>
                  </p>
                ) : null}
                {data.dirtyArrivals.length ? (
                  <p className="text-destructive">
                    {data.dirtyArrivals.length} chegada(s) em quarto sujo ou manutenção
                  </p>
                ) : null}
                {data.pendentesSaldo.length ? (
                  <p>{data.pendentesSaldo.length} conta(s) com saldo em aberto</p>
                ) : null}
                {!data.preReservas.length &&
                !data.dirtyArrivals.length &&
                !data.pendentesSaldo.length ? (
                  <p className="text-muted-foreground">Nenhum alerta agora.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {canReports ? <AnnualChart /> : null}

      <CreateReservationModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
