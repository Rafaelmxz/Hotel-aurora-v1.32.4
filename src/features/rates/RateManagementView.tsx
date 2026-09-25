import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addDays, addMonths, eachDayOfInterval, format, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatCurrency,
  parseISODate,
  TODAY_ISO,
  toISODate,
  type RoomType,
} from "@/mocks/hotelData";
import { paintNight, quoteStay } from "./pricing";
import { OffersView } from "./OffersView";
import { PackagesView } from "./PackagesView";
import { PromoCodesView } from "./PromoCodesView";
import {
  useAddSeason,
  useCategoryRates,
  usePatchCategoryRate,
  useRemoveSeason,
  useSeasons,
} from "./useRates";
import { useRoomTypes } from "@/features/rooms/useRoomTypes";
import { typeHoldsParty } from "@/features/rooms/roomTypeStore";
import { saleCloseOnNight } from "@/features/reservations/overbooking";
import { useCreateSaleClose, useRemoveSaleClose, useSaleCloses } from "@/features/reservations/useSaleCloses";
import { fillBand, OCCUPANCY_FIELDS, OCCUPANCY_LABEL, clampSitePercent } from "./rateStore";
import type { OccupancyField, RateBand, RateSegment, SeasonModifier } from "./rateStore";

const ROOM_TYPES: RoomType[] = ["Standard", "Luxo", "Suíte"];

type TabId = "tarifas" | "pacotes" | "cupons" | "ofertas";

const TABS: Array<[TabId, string]> = [
  ["tarifas", "Tarifas"],
  ["pacotes", "Pacotes"],
  ["cupons", "Cupons"],
  ["ofertas", "Ofertas"],
];

const tarifasRoute = getRouteApi("/tarifas");

function abaFromSearch(aba?: string): TabId {
  if (aba === "pacotes" || aba === "cupons" || aba === "ofertas" || aba === "tarifas") return aba;
  return "tarifas";
}

export function RateManagementView() {
  const { aba } = tarifasRoute.useSearch();
  const navigate = useNavigate({ from: "/tarifas" });
  const [tab, setTab] = useState<TabId>(() => abaFromSearch(aba));
  const { data: categories = [] } = useCategoryRates();
  const { data: seasons = [] } = useSeasons();
  const { data: roomTypes = [] } = useRoomTypes();
  const { data: saleCloses = [] } = useSaleCloses();
  const createClose = useCreateSaleClose();
  const removeClose = useRemoveSaleClose();
  const patchRate = usePatchCategoryRate();
  const addSeason = useAddSeason();
  const removeSeason = useRemoveSeason();

  const [draft, setDraft] = useState<Record<string, RateBand>>();
  const matrix = useMemo(() => {
    if (draft) return draft;
    const next: Record<string, RateBand> = {};
    for (const row of categories) {
      next[`${row.type}-weekday`] = { ...row.weekday };
      next[`${row.type}-weekend`] = { ...row.weekend };
    }
    return next;
  }, [categories, draft]);

  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState(TODAY_ISO);
  const [seasonEnd, setSeasonEnd] = useState(TODAY_ISO);
  const [modifier, setModifier] = useState<SeasonModifier>("percent");
  const [seasonValue, setSeasonValue] = useState("30");
  const [minNights, setMinNights] = useState("3");

  const [quoteType, setQuoteType] = useState<RoomType>("Standard");
  const [quoteIn, setQuoteIn] = useState(TODAY_ISO);
  const [quoteOut, setQuoteOut] = useState(() => toISODate(addDays(parseISODate(TODAY_ISO), 1)));
  const [quotePax, setQuotePax] = useState(2);
  const [quoteChildren, setQuoteChildren] = useState(0);
  const [quotePromo, setQuotePromo] = useState("");
  const [quoteSegment, setQuoteSegment] = useState<RateSegment>("balcao");
  const [siteDraft, setSiteDraft] = useState<Partial<Record<RoomType, number>> | null>(null);
  const siteOf = (type: RoomType) =>
    siteDraft?.[type] ?? categories.find((row) => row.type === type)?.sitePercent ?? 0;
  const liveCategories = useMemo(
    () =>
      ROOM_TYPES.map((type) => {
        const weekday = fillBand(matrix[`${type}-weekday`]);
        const weekend = fillBand(matrix[`${type}-weekend`]);
        return {
          type,
          weekday,
          weekend,
          weekdayRate: weekday.adl2,
          weekendRate: weekend.adl2,
          sitePercent: siteOf(type),
        };
      }),
    [matrix, siteDraft, categories],
  );
  const quoteOutSafe = quoteOut > quoteIn ? quoteOut : toISODate(addDays(parseISODate(quoteIn), 1));
  const quote = quoteStay(quoteType, quoteIn, quoteOutSafe, {
    adults: quotePax,
    children: quoteChildren,
    promoCode: quotePromo || undefined,
    segment: quoteSegment,
    categories: liveCategories,
  });
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(parseISODate(TODAY_ISO)));
  const [paintMode, setPaintMode] = useState<"simular" | "fechar">("simular");
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
    const end = addDays(start, 41);
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);
  const monthPaints = useMemo(() => {
    const map = new Map<string, ReturnType<typeof paintNight>>();
    for (const day of monthDays) {
      const iso = toISODate(day);
      map.set(
        iso,
        paintNight(quoteType, iso, {
          adults: quotePax,
          children: quoteChildren,
          categories: liveCategories,
          seasons,
        }),
      );
    }
    return map;
  }, [monthDays, quoteType, quotePax, quoteChildren, liveCategories, seasons]);
  const firstNight = quote.nightsDetail[0];
  const quoteProfile = roomTypes.find((row) => row.type === quoteType);
  const quoteFits = quoteProfile ? typeHoldsParty(quoteProfile, quotePax, quoteChildren) : true;

  useEffect(() => {
    setTab(abaFromSearch(aba));
  }, [aba]);

  function selectTab(id: TabId) {
    setTab(id);
    void navigate({ search: { aba: id === "tarifas" ? undefined : id } });
  }

  function updateBand(key: string, field: OccupancyField, value: string) {
    const current = fillBand(matrix[key]);
    setDraft({
      ...matrix,
      [key]: { ...current, [field]: Number(value) || 0 },
    });
  }

  async function onCalendarDay(iso: string, day: Date) {
    if (paintMode === "simular") {
      setQuoteIn(iso);
      setQuoteOut(toISODate(addDays(day, 1)));
      return;
    }
    const hit = saleCloseOnNight(saleCloses, quoteType, iso);
    try {
      if (hit) {
        await removeClose.mutateAsync(hit.id);
        toast.success(`Venda reaberta · ${quoteType} ${iso}`);
        return;
      }
      await createClose.mutateAsync({
        roomType: quoteType,
        checkIn: iso,
        checkOut: toISODate(addDays(day, 1)),
        reason: "Fechado no tarifário",
      });
      toast.success(`Venda fechada · ${quoteType} ${iso}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a venda.");
    }
  }

  async function saveRates() {
    try {
      for (const type of ROOM_TYPES) {
        await patchRate.mutateAsync({
          type,
          weekday: matrix[`${type}-weekday`],
          weekend: matrix[`${type}-weekend`],
          sitePercent: siteOf(type),
        });
      }
      setDraft(undefined);
      setSiteDraft(null);
      toast.success("Tarifas atualizadas · reservas já feitas mantêm o preço");
    } catch {
      toast.error("Não foi possível salvar as tarifas.");
    }
  }

  async function onAddSeason(event: FormEvent) {
    event.preventDefault();
    try {
      await addSeason.mutateAsync({
        name: seasonName,
        start: seasonStart,
        end: seasonEnd,
        modifier,
        value: Number(seasonValue),
        minNights: Math.max(1, Number(minNights) || 1),
      });
      setSeasonName("");
      toast.success("Temporada cadastrada");
    } catch {
      toast.error("Não foi possível cadastrar a temporada.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Comercial
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Tarifas e ofertas</h1>
        <p className="text-sm text-muted-foreground">
          Diárias, temporadas, pacotes, cupons e regras de pagamento.
        </p>
      </header>

      <div className="grid grid-cols-2 rounded-full bg-secondary p-1 sm:grid-cols-4">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "h-10 rounded-full text-sm font-medium",
              tab === id
                ? "bg-card text-foreground shadow-[var(--shadow-border)]"
                : "text-muted-foreground",
            )}
            onClick={() => selectTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cupons" ? <PromoCodesView /> : null}
      {tab === "pacotes" ? <PackagesView /> : null}
      {tab === "ofertas" ? <OffersView /> : null}

      {tab === "tarifas" ? (
        <>
          <section className="overflow-x-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  {OCCUPANCY_FIELDS.map((field) => (
                    <th key={field} className="px-4 py-3 font-medium">
                      {OCCUPANCY_LABEL[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROOM_TYPES.flatMap((type) =>
                  (["weekday", "weekend"] as const).map((period) => {
                    const key = `${type}-${period}`;
                    const band = matrix[key];
                    return (
                      <tr key={key} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{type}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {period === "weekday" ? "Seg–Qui" : "Sex–Dom"}
                        </td>
                        {OCCUPANCY_FIELDS.map((field) => (
                          <td key={field} className="px-4 py-3">
                            <Input
                              inputMode="numeric"
                              value={band?.[field] ?? ""}
                              onChange={(event) =>
                                updateBand(key, field, event.target.value)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
            <div className="flex justify-end border-t border-border p-3">
              <Button onClick={() => void saveRates()} disabled={patchRate.isPending}>
                Salvar tarifas
              </Button>
            </div>
          </section>

          <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-xl font-medium tracking-tight">Diária do site</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A grelha é o balcão. No site, aplique desconto ou acréscimo sobre essa diária. 0 = igual.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {ROOM_TYPES.map((type) => {
                const signed = siteOf(type);
                const mode = signed < 0 ? "desconto" : "acrescimo";
                const amount = Math.abs(signed);
                const write = (nextMode: "desconto" | "acrescimo", nextAmount: number) => {
                  const percent = nextMode === "desconto" ? -Math.abs(nextAmount) : Math.abs(nextAmount);
                  setSiteDraft({
                    Standard: siteOf("Standard"),
                    Luxo: siteOf("Luxo"),
                    Suíte: siteOf("Suíte"),
                    [type]: clampSitePercent(percent),
                  });
                };
                return (
                  <div key={type} className="grid gap-2">
                    <Label>{type}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={mode === "desconto" ? "default" : "outline"}
                        onClick={() => write("desconto", amount)}
                      >
                        Desconto
                      </Button>
                      <Button
                        type="button"
                        variant={mode === "acrescimo" ? "default" : "outline"}
                        onClick={() => write("acrescimo", amount)}
                      >
                        Acréscimo
                      </Button>
                    </div>
                    <Input
                      inputMode="numeric"
                      value={String(amount)}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/\D/g, "");
                        write(mode, clampSitePercent(raw === "" ? 0 : raw));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {amount === 0
                        ? "Site igual ao balcão"
                        : mode === "desconto"
                          ? `Site ${amount}% mais barato`
                          : `Site ${amount}% mais caro`}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-medium tracking-tight">
                Calendário · {quoteType}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label="Mês anterior"
                  onClick={() => setMonthCursor((current) => addMonths(current, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <p className="min-w-36 text-center text-sm font-medium capitalize">
                  {format(monthCursor, "MMMM yyyy", { locale: ptBR })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label="Próximo mês"
                  onClick={() => setMonthCursor((current) => addMonths(current, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Simular escolhe a noite. Fechar venda trava o tipo neste dia (mesmo cofre da aba Hotel).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={paintMode === "simular" ? "default" : "outline"}
                onClick={() => setPaintMode("simular")}
              >
                Simular
              </Button>
              <Button
                type="button"
                size="sm"
                variant={paintMode === "fechar" ? "default" : "outline"}
                onClick={() => setPaintMode("fechar")}
              >
                Fechar venda
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground uppercase">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthDays.map((day) => {
                const iso = toISODate(day);
                const inMonth = day.getMonth() === monthCursor.getMonth();
                const paint = monthPaints.get(iso);
                const selected = iso === quoteIn;
                const closed = Boolean(saleCloseOnNight(saleCloses, quoteType, iso));
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!inMonth || createClose.isPending || removeClose.isPending}
                    onClick={() => void onCalendarDay(iso, day)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center rounded-md border-2 px-1 py-1 text-xs tabular-nums",
                      !inMonth && "opacity-30",
                      inMonth && paint?.weekend && !closed && "bg-primary/15",
                      inMonth && paint && !paint.weekend && !closed && "bg-secondary",
                      inMonth && paint?.season && !closed
                        ? "border-status-pending bg-status-pending/25"
                        : !closed && "border-transparent",
                      closed && "border-destructive bg-destructive/20 text-destructive line-through",
                      selected && !closed && "border-primary",
                    )}
                  >
                    <span className="font-medium">{format(day, "d")}</span>
                    {inMonth && closed ? (
                      <span className="text-[10px] leading-tight">Fechado</span>
                    ) : inMonth && paint ? (
                      <span className="text-[10px] leading-tight">
                        {formatCurrency(paint.amount)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm bg-secondary" /> Seg–Qui
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm bg-primary/15" /> Sex–Dom
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-sm border-2 border-destructive bg-destructive/20" /> Fechado
              </span>
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <form
              onSubmit={onAddSeason}
              className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
            >
              <h2 className="font-display text-xl font-medium tracking-tight">
                Temporada / feriado
              </h2>
              <div className="grid gap-2">
                <Label htmlFor="season-name">Nome</Label>
                <Input
                  id="season-name"
                  required
                  value={seasonName}
                  onChange={(event) => setSeasonName(event.target.value)}
                  placeholder="Réveillon"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    required
                    value={seasonStart}
                    onChange={(event) => setSeasonStart(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Término</Label>
                  <Input
                    type="date"
                    required
                    value={seasonEnd}
                    onChange={(event) => setSeasonEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Modificador</Label>
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                    value={modifier}
                    onChange={(event) => setModifier(event.target.value as SeasonModifier)}
                  >
                    <option value="percent">Acréscimo %</option>
                    <option value="fixed">Valor fixo / diária</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Valor</Label>
                  <Input
                    required
                    inputMode="decimal"
                    value={seasonValue}
                    onChange={(event) => setSeasonValue(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Mínimo de noites</Label>
                <Input
                  required
                  inputMode="numeric"
                  value={minNights}
                  onChange={(event) => setMinNights(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={addSeason.isPending}>
                Cadastrar regra
              </Button>
            </form>

            <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <h2 className="font-display text-xl font-medium tracking-tight">Simular reserva</h2>
              <div className="mt-3 grid gap-3">
                <select
                  className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                  value={quoteType}
                  onChange={(event) => setQuoteType(event.target.value as RoomType)}
                >
                  {ROOM_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={quoteSegment === "balcao" ? "default" : "outline"}
                    onClick={() => setQuoteSegment("balcao")}
                  >
                    Balcão
                  </Button>
                  <Button
                    type="button"
                    variant={quoteSegment === "site" ? "default" : "outline"}
                    onClick={() => setQuoteSegment("site")}
                  >
                    Site
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                    value={quotePax}
                    onChange={(event) => setQuotePax(Number(event.target.value))}
                  >
                    <option value={1}>1 adulto</option>
                    <option value={2}>2 adultos</option>
                    <option value={3}>3 adultos</option>
                    <option value={4}>4 adultos</option>
                    <option value={5}>5 adultos</option>
                    <option value={6}>6 adultos</option>
                  </select>
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                    value={quoteChildren}
                    onChange={(event) => setQuoteChildren(Number(event.target.value))}
                  >
                    <option value={0}>0 crianças</option>
                    <option value={1}>1 criança</option>
                    <option value={2}>2 crianças</option>
                    <option value={3}>3 crianças</option>
                    <option value={4}>4 crianças</option>
                  </select>
                </div>
                <Input
                  type="date"
                  value={quoteIn}
                  onChange={(event) => {
                    const next = event.target.value || TODAY_ISO;
                    setQuoteIn(next);
                    if (!(quoteOut > next)) setQuoteOut(toISODate(addDays(parseISODate(next), 1)));
                  }}
                />
                <Input type="date" min={quoteIn} value={quoteOutSafe} onChange={(event) => setQuoteOut(event.target.value)} />
                <Input
                  value={quotePromo}
                  onChange={(event) => setQuotePromo(event.target.value.toUpperCase())}
                  placeholder="Cupom (CLIENTEVIP)"
                />
                {!quoteFits ? (
                    <div className="rounded-lg border-2 border-destructive bg-destructive/15 p-4 text-destructive">
                      <p className="text-lg font-semibold leading-tight">Capacidade excedida</p>
                      <p className="mt-1 text-sm">
                        {quoteType} cabe {quoteProfile?.maxAdults ?? "?"} adulto(s) e{" "}
                        {quoteProfile?.maxChildren ?? 0} criança(s). Recepção pode confirmar: entra
                        taxa extra +ADL / +CHD.
                      </p>
                    </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {firstNight?.weekend ? "Linha Sex–Dom" : "Linha Seg–Qui"} ·{" "}
                  {quotePax} ADL
                  {quoteChildren ? ` + ${quoteChildren} CHD` : ""}
                  {firstNight ? ` · tabela ${formatCurrency(firstNight.base)}` : ""}
                </p>
                {firstNight?.season ? (
                  <p className="text-sm text-muted-foreground">
                    Temporada {firstNight.season.name} nesta data — por isso o total não é só a tabela.
                  </p>
                ) : null}
                {quote.offerDiscountTotal > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Oferta −{formatCurrency(quote.offerDiscountTotal)}
                  </p>
                ) : null}
                <p className="text-sm">
                  {quote.nights} noites · média {formatCurrency(quote.averageNight)}
                </p>
                {quote.discount > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Subtotal {formatCurrency(quote.subtotal)} − cupom {formatCurrency(quote.discount)}
                  </p>
                ) : null}
                <p className="font-display text-2xl font-medium tabular-nums">
                  {formatCurrency(quote.total)}
                </p>
                {!quote.minNightsOk ? (
                  <p className="text-sm text-status-pending">
                    Mínimo do pacote/temporada: {quote.minNightsRequired} noites
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-card shadow-[var(--shadow-border)]">
            <ul className="divide-y divide-border">
              {seasons.map((season) => (
                <li key={season.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{season.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {season.start} → {season.end} ·{" "}
                      {season.modifier === "percent"
                        ? `+${season.value}%`
                        : `+${formatCurrency(season.value)}/noite`}{" "}
                      · mín. {season.minNights} noites
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void removeSeason.mutateAsync(season.id)}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
