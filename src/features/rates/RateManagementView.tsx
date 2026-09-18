import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  TODAY_ISO,
  type RoomType,
} from "@/mocks/hotelData";
import { quoteStay } from "./pricing";
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
import type { MealPlan, PaxCount, RateBand, SeasonModifier } from "./rateStore";

const ROOM_TYPES: RoomType[] = ["Standard", "Luxo", "Suíte"];
const BAND_FIELDS: Array<keyof RateBand> = [
  "pax1Cafe",
  "pax1Pensao",
  "pax2Cafe",
  "pax2Pensao",
];
const BAND_LABEL: Record<keyof RateBand, string> = {
  pax1Cafe: "1 pax · café",
  pax1Pensao: "1 pax · pensão",
  pax2Cafe: "2 pax · café",
  pax2Pensao: "2 pax · pensão",
};

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
  const [quoteOut, setQuoteOut] = useState(TODAY_ISO);
  const [quotePax, setQuotePax] = useState<PaxCount>(2);
  const [quoteMeal, setQuoteMeal] = useState<MealPlan>("cafe");
  const [quotePromo, setQuotePromo] = useState("");
  const quote = quoteStay(quoteType, quoteIn, quoteOut || quoteIn, {
    pax: quotePax,
    mealPlan: quoteMeal,
    promoCode: quotePromo || undefined,
  });

  useEffect(() => {
    setTab(abaFromSearch(aba));
  }, [aba]);

  function selectTab(id: TabId) {
    setTab(id);
    void navigate({ search: { aba: id === "tarifas" ? undefined : id } });
  }

  function updateBand(key: string, field: keyof RateBand, value: string) {
    const current = matrix[key] ?? {
      pax1Cafe: 0,
      pax1Pensao: 0,
      pax2Cafe: 0,
      pax2Pensao: 0,
    };
    setDraft({
      ...matrix,
      [key]: { ...current, [field]: Number(value) || 0 },
    });
  }

  async function saveRates() {
    try {
      for (const type of ROOM_TYPES) {
        await patchRate.mutateAsync({
          type,
          weekday: matrix[`${type}-weekday`],
          weekend: matrix[`${type}-weekend`],
        });
      }
      setDraft(undefined);
      toast.success("Tarifas atualizadas · reservas abertas recalculadas");
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
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  {BAND_FIELDS.map((field) => (
                    <th key={field} className="px-4 py-3 font-medium">
                      {BAND_LABEL[field]}
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
                        {BAND_FIELDS.map((field) => (
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
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                    value={quotePax}
                    onChange={(event) => setQuotePax(Number(event.target.value) as PaxCount)}
                  >
                    <option value={1}>1 hóspede</option>
                    <option value={2}>2 hóspedes</option>
                  </select>
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                    value={quoteMeal}
                    onChange={(event) => setQuoteMeal(event.target.value as MealPlan)}
                  >
                    <option value="cafe">Com café</option>
                    <option value="pensao">Pensão completa</option>
                  </select>
                </div>
                <Input type="date" value={quoteIn} onChange={(event) => setQuoteIn(event.target.value)} />
                <Input type="date" value={quoteOut} onChange={(event) => setQuoteOut(event.target.value)} />
                <Input
                  value={quotePromo}
                  onChange={(event) => setQuotePromo(event.target.value.toUpperCase())}
                  placeholder="Cupom (CLIENTEVIP)"
                />
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
