import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY_ISO, formatCurrency, type RoomType } from "@/mocks/hotelData";
import { useAddOffer, useOffers, usePatchOffer, useRemoveOffer } from "./useOffers";
import type { OfferKind } from "./offerStore";

const ROOM_TYPES: RoomType[] = ["Standard", "Luxo", "Suíte"];
const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function OffersView() {
  const { data: offers = [] } = useOffers();
  const addOffer = useAddOffer();
  const patchOffer = usePatchOffer();
  const removeOffer = useRemoveOffer();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OfferKind>("percent");
  const [value, setValue] = useState("10");
  const [start, setStart] = useState(TODAY_ISO);
  const [end, setEnd] = useState(TODAY_ISO);
  const [active, setActive] = useState(true);
  const [pixOnly, setPixOnly] = useState(false);
  const [minNights, setMinNights] = useState("0");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  function toggleType(type: RoomType) {
    setRoomTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function toggleDay(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await addOffer.mutateAsync({
        name,
        kind,
        value: Number(value),
        start,
        end,
        roomTypes,
        weekdays,
        pixOnly,
        minNights: Math.max(0, Number(minNights) || 0),
        active,
      });
      setName("");
      toast.success("Oferta cadastrada");
    } catch {
      toast.error("Não foi possível cadastrar a oferta.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Regras ativas entram no site do hóspede (Pix, dias da semana e mínimo de noites).
      </p>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        >
          <div className="grid gap-2">
            <Label>Nome da promoção</Label>
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Desconto Pix"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo de desconto</Label>
              <select
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={kind}
                onChange={(event) => setKind(event.target.value as OfferKind)}
              >
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>{kind === "percent" ? "Percentual" : "Valor R$"}</Label>
              <Input
                required
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Início</Label>
              <Input type="date" required value={start} onChange={(event) => setStart(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fim</Label>
              <Input type="date" required value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                value={active ? "ativa" : "inativa"}
                onChange={(event) => setActive(event.target.value === "ativa")}
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Mínimo de noites</Label>
              <Input
                inputMode="numeric"
                value={minNights}
                onChange={(event) => setMinNights(event.target.value)}
                placeholder="0 = sem mínimo"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pixOnly} onChange={(event) => setPixOnly(event.target.checked)} />
            Exclusivo para Pix
          </label>
          <div className="grid gap-2">
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className="inline-flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={weekdays.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Tipos de quarto</Label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <label key={type} className="inline-flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={roomTypes.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={addOffer.isPending}>
            Cadastrar oferta
          </Button>
        </form>

        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
          {offers.map((offer) => (
            <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium">
                  {offer.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    {offer.active ? "· Ativa" : "· Inativa"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {offer.kind === "percent" ? `${offer.value}%` : formatCurrency(offer.value)} ·{" "}
                  {offer.start} → {offer.end}
                  {offer.pixOnly ? " · Pix" : ""}
                  {offer.minNights > 0 ? ` · mín. ${offer.minNights} noites` : ""}
                  {offer.weekdays.length ? " · dias filtrados" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    void patchOffer.mutateAsync({ id: offer.id, active: !offer.active })
                  }
                >
                  {offer.active ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="outline" onClick={() => void removeOffer.mutateAsync(offer.id)}>
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
