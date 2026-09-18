import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/mocks/hotelData";
import { useProperty } from "@/features/settings/useProperty";
import { useReservations } from "@/features/reservations/useReservations";
import { METODO_PAGAMENTO_LABEL, type MetodoPagamento } from "@/features/reservations/types/folio";
import { cn } from "@/lib/utils";
import {
  buildPeriodReport,
  delta,
  periodRange,
  previousRange,
  type ReportMode,
} from "./computeReports";

const METHODS: MetodoPagamento[] = [
  "pix",
  "cartao_credito",
  "cartao_debito",
  "dinheiro",
];

function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function ReportsView() {
  const { data: reservations = [] } = useReservations();
  const { data: property } = useProperty();
  const [mode, setMode] = useState<ReportMode>("month");
  const [cursor, setCursor] = useState(() => new Date());

  const currentRange = periodRange(mode, cursor);
  const prevRange = previousRange(mode, cursor);
  const current = useMemo(
    () => buildPeriodReport(reservations, currentRange.start, currentRange.end),
    [reservations, currentRange.start, currentRange.end],
  );
  const previous = useMemo(
    () => buildPeriodReport(reservations, prevRange.start, prevRange.end),
    [reservations, prevRange.start, prevRange.end],
  );

  const periodLabel =
    mode === "year"
      ? format(currentRange.start, "yyyy")
      : format(currentRange.start, "MMMM yyyy", { locale: ptBR });

  const kpis = [
    {
      key: "occ",
      label: "Taxa de ocupação",
      value: `${current.kpis.occupancy.toFixed(1)}%`,
      hint: `${current.kpis.occupiedNights} de ${current.kpis.availableNights} noites-quarto`,
      change: delta(current.kpis.occupancy, previous.kpis.occupancy),
    },
    {
      key: "adr",
      label: "ADR / diária média",
      value: formatCurrency(current.kpis.adr),
      hint: "Receita de diárias / quartos vendidos",
      change: delta(current.kpis.adr, previous.kpis.adr),
    },
    {
      key: "revpar",
      label: "RevPAR",
      value: formatCurrency(current.kpis.revpar),
      hint: "Receita de diárias / quartos disponíveis",
      change: delta(current.kpis.revpar, previous.kpis.revpar),
    },
  ];

  function exportCsv() {
    const rows = [
      ["Relatório", property.name, periodLabel],
      ["Indicador", "Atual", "Anterior", "Variação"],
      ["Ocupação %", current.kpis.occupancy.toFixed(1), previous.kpis.occupancy.toFixed(1), pct(delta(current.kpis.occupancy, previous.kpis.occupancy))],
      ["ADR", String(Math.round(current.kpis.adr)), String(Math.round(previous.kpis.adr)), pct(delta(current.kpis.adr, previous.kpis.adr))],
      ["RevPAR", String(Math.round(current.kpis.revpar)), String(Math.round(previous.kpis.revpar)), pct(delta(current.kpis.revpar, previous.kpis.revpar))],
      ["Receita diárias", String(Math.round(current.dre.roomRevenue)), String(Math.round(previous.dre.roomRevenue))],
      ["Consumos", String(Math.round(current.dre.extras)), String(Math.round(previous.dre.extras))],
      ["Receita bruta", String(Math.round(current.dre.gross)), String(Math.round(previous.dre.gross)), pct(delta(current.dre.gross, previous.dre.gross))],
      ...METHODS.map((method) => [
        METODO_PAGAMENTO_LABEL[method],
        String(Math.round(current.dre.byMethod[method])),
        String(Math.round(previous.dre.byMethod[method])),
      ]),
    ];
    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${format(currentRange.start, "yyyy-MM")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Relatórios gerenciais
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight capitalize">
            {periodLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Ocupação, ADR, RevPAR e DRE simplificado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full bg-secondary p-1">
            <button
              type="button"
              className={cn(
                "h-9 rounded-full px-3 text-sm font-medium",
                mode === "month" ? "bg-card shadow-[var(--shadow-border)]" : "text-muted-foreground",
              )}
              onClick={() => setMode("month")}
            >
              Mensal
            </button>
            <button
              type="button"
              className={cn(
                "h-9 rounded-full px-3 text-sm font-medium",
                mode === "year" ? "bg-card shadow-[var(--shadow-border)]" : "text-muted-foreground",
              )}
              onClick={() => setMode("year")}
            >
              Anual
            </button>
          </div>
          <input
            type={mode === "year" ? "number" : "month"}
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
            value={
              mode === "year"
                ? String(cursor.getFullYear())
                : format(cursor, "yyyy-MM")
            }
            onChange={(event) => {
              const value = event.target.value;
              if (mode === "year") setCursor(new Date(Number(value), 0, 1));
              else {
                const [year, month] = value.split("-").map(Number);
                setCursor(new Date(year, (month ?? 1) - 1, 1));
              }
            }}
          />
          <Button variant="outline" onClick={exportCsv}>
            CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir / PDF
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {kpis.map((item) => (
          <Card key={item.key}>
            <CardContent>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {item.label}
              </p>
              <p className="font-display mt-2 text-3xl font-medium tracking-tight tabular-nums">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              <p
                className={cn(
                  "mt-2 text-sm tabular-nums",
                  item.change >= 0 ? "text-status-checkout" : "text-status-pending",
                )}
              >
                {pct(item.change)} vs período anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-xl font-medium tracking-tight">DRE simplificado</h2>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <dt className="text-muted-foreground">Receita de diárias</dt>
          <dd className="tabular-nums sm:text-right">{formatCurrency(current.dre.roomRevenue)}</dd>
          <dt className="text-muted-foreground">Consumos / extras</dt>
          <dd className="tabular-nums sm:text-right">{formatCurrency(current.dre.extras)}</dd>
          <dt className="font-medium">Receita bruta</dt>
          <dd className="font-medium tabular-nums sm:text-right">
            {formatCurrency(current.dre.gross)}
          </dd>
          <dt className="text-muted-foreground">Receita bruta anterior</dt>
          <dd className="tabular-nums sm:text-right">{formatCurrency(previous.dre.gross)}</dd>
          <dt className="text-muted-foreground">Variação</dt>
          <dd className="tabular-nums sm:text-right">
            {pct(delta(current.dre.gross, previous.dre.gross))}
          </dd>
        </dl>

        <h3 className="mt-6 text-sm font-medium">Formas de recebimento</h3>
        <ul className="mt-2 divide-y divide-border">
          {METHODS.map((method) => (
            <li key={method} className="flex items-center justify-between py-2 text-sm">
              <span>{METODO_PAGAMENTO_LABEL[method]}</span>
              <span className="tabular-nums">{formatCurrency(current.dre.byMethod[method])}</span>
            </li>
          ))}
          <li className="flex items-center justify-between py-2 text-sm font-medium">
            <span>Total recebido</span>
            <span className="tabular-nums">{formatCurrency(current.dre.received)}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
