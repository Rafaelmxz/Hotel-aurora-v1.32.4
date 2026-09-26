/**
 * Motor público: quarto → extras → dados.
 * Pode: lista vertical, banner que encolhe, experiências à parte.
 * Proibido: clonar HSystem, tarifário extra, OTA, mudar ouro/Pix.
 * Preço: quoteStay da grelha (C1). Criança conta no tipo (2+1), não na capacidade do quarto.
 */
import { useMemo, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addDays } from "date-fns";
import {
  TODAY_ISO,
  formatCurrency,
  parseISODate,
  rooms,
  stayNights,
  toISODate,
  type Reservation,
  type RoomType,
} from "@/mocks/hotelData";
import { useProperty } from "@/features/settings/useProperty";
import { quoteStay } from "@/features/rates/pricing";
import { availableRoomsByType } from "@/features/reservations/overbooking";
import { useCreatePublicReservation, useReservations } from "@/features/reservations/useReservations";
import { useBlocks } from "@/features/reservations/useBlocks";
import { useSaleCloses } from "@/features/reservations/useSaleCloses";
import { useRooms } from "@/features/rooms/useRooms";
import { useRoomTypes } from "@/features/rooms/useRoomTypes";
import { occupancyOfType, typeFitsParty } from "@/features/rooms/roomTypeStore";
import { useBookingConfig } from "@/features/direct-booking/useBookingEngine";
import { StayVoucher } from "@/features/reservations/components/StayVoucher";
import { getFolio } from "@/features/reservations/folioStore";
import { PixCharge, pixNote } from "@/features/finance/PixCharge";
import { pixTxid } from "@/lib/pix/brcode";
import { extraStory } from "./catalog";
import {
  EXTRA_UNIT_LABEL,
  extraQuantity,
  quoteExtras,
  type BookingExtra,
} from "./bookingStore";

type Step = "vitrine" | "extras" | "pagamento" | "voucher";

function nextNight(iso: string) {
  return toISODate(addDays(parseISODate(iso), 1));
}

function occupancyGridLabel(adults: number, children: number) {
  const adl = adults <= 4 ? `${adults} ADL` : `4 ADL + ${adults - 4} extra`;
  const chd =
    children <= 0 ? "" : children <= 2 ? ` · ${children} CHD` : ` · 2 CHD + ${children - 2} extra`;
  return `Tarifa da grelha · ${adl}${chd}`;
}

function ExperienceCards({
  extras,
  extraIds,
  nights,
  guests,
  searched,
  onToggle,
}: {
  extras: BookingExtra[];
  extraIds: string[];
  nights: number;
  guests: number;
  searched: boolean;
  onToggle: (id: string) => void;
}) {
  if (!extras.length) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Nenhuma experiência extra neste momento. Pode continuar a reserva.
      </p>
    );
  }
  return (
    <div className="grid gap-4">
      {extras.map((item) => {
        const story = extraStory(item.id);
        const picked = extraIds.includes(item.id);
        const qty = extraQuantity(item, nights, guests);
        const stayTotal = item.price * qty;
        return (
          <article
            key={item.id}
            className={cn(
              "grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-[10rem_1fr]",
              picked && "ring-2 ring-primary",
            )}
          >
            <img src={story.photo} alt="" className="h-36 w-full object-cover sm:h-full" />
            <div className="grid gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{item.name}</h3>
                {picked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    <Check className="size-3" />
                    Incluída
                  </span>
                ) : null}
              </div>
              <p className="text-sm">{story.blurb}</p>
              {story.included ? (
                <p className="text-xs text-muted-foreground">{story.included}</p>
              ) : null}
              <p className="text-sm">
                {formatCurrency(item.price)} {EXTRA_UNIT_LABEL[item.unit]}
                {searched
                  ? qty > 1
                    ? ` · ${qty} × ${formatCurrency(item.price)} = ${formatCurrency(stayTotal)} nesta estadia`
                    : ` · ${formatCurrency(stayTotal)} nesta estadia`
                  : ""}
              </p>
              <Button
                type="button"
                variant={picked ? "outline" : "default"}
                className="justify-self-start"
                onClick={() => onToggle(item.id)}
              >
                {picked ? "Remover" : "Incluir"}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PublicShowcaseView() {
  const { data: config } = useBookingConfig();
  const { data: property } = useProperty();
  const { data: reservations = [] } = useReservations();
  const { data: roomList = [] } = useRooms();
  const { data: types = [] } = useRoomTypes();
  const { data: blocks = [] } = useBlocks();
  const { data: saleCloses = [] } = useSaleCloses();
  const create = useCreatePublicReservation();
  const [checkIn, setCheckIn] = useState(TODAY_ISO);
  const [checkOut, setCheckOut] = useState(() => nextNight(TODAY_ISO));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [searched, setSearched] = useState(true);
  const [step, setStep] = useState<Step>("vitrine");
  const [roomType, setRoomType] = useState<RoomType | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payMode, setPayMode] = useState<"pix" | "checkin">("pix");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [voucher, setVoucher] = useState<{
    reservation: Reservation;
    roomLabel: string;
    totais: {
      totalDiarias: number;
      totalConsumo: number;
      totalPagamentos: number;
      saldo: number;
    };
  } | null>(null);

  const occupancy = adults + children;
  const periodOk = Boolean(checkIn && checkOut && checkOut > checkIn);
  const nights = periodOk ? stayNights(checkIn, checkOut) : 1;
  const available = useMemo(
    () =>
      periodOk
        ? availableRoomsByType(
            reservations,
            checkIn,
            checkOut,
            roomList.length ? roomList : rooms,
            blocks,
            saleCloses,
          )
        : {},
    [periodOk, reservations, checkIn, checkOut, roomList, blocks, saleCloses],
  );

  const catalog = types.map((item) => {
    const fits = typeFitsParty(item, adults, children);
    const free = fits ? (available[item.type] ?? []) : [];
    const quote = periodOk
      ? quoteStay(item.type, checkIn, checkOut, { adults, children, segment: "site" })
      : null;
    return { ...item, free: free.length, quote, rooms: free, capacity: occupancyOfType(item) };
  });

  const selected = catalog.find((item) => item.type === roomType);
  const quote =
    roomType && periodOk
      ? quoteStay(roomType, checkIn, checkOut, { adults, children, pix: payMode === "pix", segment: "site" })
      : null;
  const extrasQuote = quoteExtras(
    config.extras ?? [],
    extraIds,
    quote?.nights ?? nights,
    occupancy,
  );
  const extrasTotal = extrasQuote.total;
  const stayTotal = (quote?.total ?? 0) + extrasTotal;
  const deposit = stayTotal ? Math.round(stayTotal * (config.depositPercent / 100)) : 0;
  const pixSeed = `${roomType}-${checkIn}-${checkOut}-${deposit}-${extraIds.join(",")}`;
  const extraCatalog = (config.extras ?? []).filter((item) => item.enabled);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!periodOk) {
      toast.error("Informe um período válido de check-in e check-out.");
      return;
    }
    setSearched(true);
    setVoucher(null);
    if (step === "extras" || step === "pagamento") {
      const item = catalog.find((row) => row.type === roomType);
      if (!item || item.free === 0) {
        toast.warning("Esta categoria não está livre nestas datas. Escolha outro quarto.");
        setStep("vitrine");
      }
      return;
    }
    setStep("vitrine");
    const any = catalog.some((item) => item.free > 0);
    if (!any) toast.warning("Não há quartos livres para essas datas e ocupação.");
  }

  function chooseType(type: RoomType) {
    const item = catalog.find((row) => row.type === type);
    if (searched && (!item || item.free === 0)) {
      toast.error("Esta categoria não está disponível no período.");
      return;
    }
    if (!searched) {
      toast.error("Busque a disponibilidade primeiro.");
      return;
    }
    setRoomType(type);
    setStep("extras");
  }

  function resetToVitrine() {
    setName("");
    setEmail("");
    setVoucher(null);
    setExtraIds([]);
    setStep("vitrine");
  }

  function toggleExtra(id: string) {
    setExtraIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const room = selected?.rooms[0];
    if (!room || !roomType) {
      toast.error("Nenhum quarto livre nesta categoria.");
      return;
    }
    if (payMode === "pix" && deposit < 1) {
      toast.error("Não há valor de sinal para gerar o Pix.");
      return;
    }
    const liveQuote =
      roomType && checkIn && checkOut
        ? quoteStay(roomType, checkIn, checkOut, { adults, children, pix: payMode === "pix", segment: "site" })
        : quote;
    const liveExtras = quoteExtras(
      config.extras ?? [],
      extraIds,
      liveQuote?.nights ?? nights,
      occupancy,
    );
    const liveStay = (liveQuote?.total ?? 0) + liveExtras.total;
    const depositPaid =
      payMode === "pix" && liveStay > 0
        ? Math.max(1, Math.round(liveStay * (config.depositPercent / 100)))
        : 0;
    const txid = pixTxid(pixSeed);
    try {
      const created = await create.mutateAsync({
        roomId: room.id,
        guestName: name,
        guestEmail: email,
        checkIn,
        checkOut,
        guests: occupancy,
        adults,
        children,
        payMode,
        extras: liveExtras.lines.map((line) => ({
          id: line.id,
          name: line.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
        deposit:
          payMode === "pix"
            ? { valor: depositPaid, comprovante: `Pix ${txid}` }
            : undefined,
        notes: [
          phone ? `Tel: ${phone}` : "",
          `${adults} adulto(s)` + (children ? ` · ${children} criança(s)` : ""),
          liveExtras.lines.length
            ? `Experiências: ${liveExtras.lines.map((line) => line.name).join(", ")}`
            : "",
          payMode === "pix"
            ? `${pixNote(pixSeed, config.depositPercent)}${
                liveQuote?.appliedOffers.length
                  ? ` · ofertas: ${liveQuote.appliedOffers.map((item) => item.name).join(", ")}`
                  : ""
              }`
            : "Pagamento no check-in",
        ]
          .filter(Boolean)
          .join(" · "),
      });
      const folio = getFolio(created.id);
      setVoucher({
        reservation: created,
        roomLabel: `Quarto ${room.number} · ${room.type}`,
        totais: folio.totais,
      });
      setStep("voucher");
      toast.success(
        payMode === "pix"
          ? `Reserva confirmada no quarto ${room.number}. Voucher enviado para ${email}.`
          : `Pré-reserva no quarto ${room.number}. Voucher enviado para ${email}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a pré-reserva.");
    }
  }

  const searchBar = (
    <form onSubmit={onSearch} className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-2 sm:grid-cols-5">
        <div className="grid gap-1">
          <Label className="text-xs">Check-in</Label>
          <Input
            type="date"
            required
            min={TODAY_ISO}
            value={checkIn}
            onChange={(event) => {
              const next = event.target.value >= TODAY_ISO ? event.target.value : TODAY_ISO;
              setCheckIn(next);
              setCheckOut(nextNight(next));
            }}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Check-out</Label>
          <Input
            type="date"
            required
            min={nextNight(checkIn)}
            value={checkOut}
            onChange={(event) => {
              const min = nextNight(checkIn);
              setCheckOut(event.target.value > checkIn ? event.target.value : min);
            }}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Adultos</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={String(adults).padStart(2, "0")}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setAdults((current) => Math.min(6, current + 1));
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setAdults((current) => Math.max(1, current - 1));
              }
            }}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              if (!digits) {
                setAdults(1);
                return;
              }
              const padded = String(adults).padStart(2, "0");
              const next = digits.startsWith(padded)
                ? Number(digits.slice(padded.length) || padded)
                : Number(digits);
              setAdults(Math.min(6, Math.max(1, next)));
            }}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Crianças</Label>
          <Input
            type="number"
            min={0}
            max={4}
            value={children}
            onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}
          />
        </div>
        {step === "vitrine" ? (
          <Button type="submit" className="self-end">
            Buscar
          </Button>
        ) : (
          <p className="self-end pb-2 text-xs text-muted-foreground">
            Datas atualizam o preço nesta tela.
          </p>
        )}
      </div>
    </form>
  );

  return (
    <div className="-mx-4 flex min-w-0 flex-col sm:-mx-6">
      {step === "vitrine" ? (
        <img src={config.photos[0]} alt="" className="h-44 w-full object-cover sm:h-52" />
      ) : null}
      <div className="sticky top-[3.6rem] z-30 bg-background">{searchBar}</div>

      {step === "voucher" && voucher ? (
        <div className="mx-auto mt-6 w-full max-w-xl px-4 pb-10 sm:px-6">
          <StayVoucher
            reservation={voucher.reservation}
            roomLabel={voucher.roomLabel}
            hotelName={property.name}
            address={property.address}
            phone={property.phone}
            checkInTime={property.checkInTime}
            checkOutTime={property.checkOutTime}
            cancellationPolicy={property.cancellationPolicy}
            totais={voucher.totais}
            heading={
              voucher.reservation.status === "pendente"
                ? "Pré-reserva enviada"
                : "Reserva confirmada"
            }
            emailedTo={voucher.reservation.guestEmail}
          />
          <Button type="button" variant="outline" className="no-print mt-3 w-full" onClick={resetToVitrine}>
            Nova reserva
          </Button>
        </div>
      ) : step === "extras" && selected ? (
        <div className="mx-auto mt-6 w-full max-w-2xl px-4 pb-10 sm:px-6">
          <button type="button" className="mb-4 text-sm underline" onClick={() => setStep("vitrine")}>
            ← Voltar aos quartos
          </button>
          <h2 className="font-display text-2xl font-medium tracking-tight">Experiências</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selected.type} · {quote?.nights} noites · diárias {formatCurrency(quote?.total ?? 0)}
            {extrasTotal > 0 ? ` · extras ${formatCurrency(extrasTotal)}` : ""}
            {" · "}
            {occupancyGridLabel(adults, children)}
          </p>
          <div className="mt-4">
            <ExperienceCards
              extras={extraCatalog}
              extraIds={extraIds}
              nights={nights}
              guests={occupancy}
              searched={searched}
              onToggle={toggleExtra}
            />
          </div>
          <Button type="button" className="mt-5 w-full" onClick={() => setStep("pagamento")}>
            Continuar
          </Button>
        </div>
      ) : step === "pagamento" && selected ? (
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-6 w-full max-w-xl px-4 pb-10 sm:px-6"
        >
          <button
            type="button"
            className="mb-4 text-sm underline"
            onClick={() => setStep("extras")}
          >
            ← Voltar às experiências
          </button>
          <img src={selected.photo} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
          <h2 className="font-display text-2xl font-medium tracking-tight">{selected.type}</h2>
          <p className="text-sm text-muted-foreground">
            {occupancy} hóspede(s) · {quote?.nights} noites · diárias {formatCurrency(quote?.total ?? 0)}
            {extrasTotal > 0 ? ` · experiências ${formatCurrency(extrasTotal)}` : ""}
            {payMode === "pix" ? ` · sinal ${formatCurrency(deposit)}` : ""}
            {" · "}
            {occupancyGridLabel(adults, children)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check-in {property.checkInTime} · Check-out {property.checkOutTime}. {property.cancellationPolicy}
          </p>
          {quote && quote.offerDiscountTotal > 0 ? (
            <p className="text-sm text-emerald-700">
              Oferta {quote.appliedOffers.map((item) => item.name).join(", ")}: −
              {formatCurrency(quote.offerDiscountTotal)}
              {payMode === "pix" ? " (Pix aplicado)" : ""}
            </p>
          ) : payMode === "checkin" ? (
            <p className="text-sm text-muted-foreground">
              Selecione Pix para aplicar regras exclusivas de pagamento.
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            {extrasQuote.lines.length ? (
              <ul className="grid gap-1 text-sm">
                {extrasQuote.lines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-3">
                    <span>
                      {line.name}
                      <span className="block text-xs text-muted-foreground">
                        {line.quantity} × {formatCurrency(line.unitPrice)}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatCurrency(line.total)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Pagamento do sinal</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={payMode === "pix"} onChange={() => setPayMode("pix")} />
                Pix agora
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={payMode === "checkin"} onChange={() => setPayMode("checkin")} />
                Pagar no check-in
              </label>
            </fieldset>
            {payMode === "pix" ? (
              <>
                <PixCharge
                  amount={deposit}
                  pixKey={property.pixKey}
                  payee={property.pixPayee || property.name}
                  address={property.address}
                  seed={pixSeed}
                  description={`Sinal ${property.name}`}
                />
                <p className="text-xs text-muted-foreground">
                  Pague no app do banco. Só confirme depois que o Pix concluir.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                A recepção confirma a pré-reserva. O pagamento entra na conta na chegada.
              </p>
            )}
            <Button type="submit" disabled={create.isPending || selected.free === 0}>
              {payMode === "pix" ? "Já paguei o Pix" : "Enviar pré-reserva"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <h1 className="font-display text-3xl font-medium tracking-tight">{property.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {property.address}
            {property.phone ? ` · ${property.phone}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Check-in {property.checkInTime} · Check-out {property.checkOutTime}
          </p>

          <h2 className="font-display mt-8 text-xl font-medium tracking-tight">Quartos</h2>
          <ul className="mt-4 grid gap-4">
            {catalog.map((item) => {
              const overCapacity = !typeFitsParty(item, adults, children);
              const soldOut = searched && item.free === 0;
              return (
                <li key={item.type}>
                  <article className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-[12rem_1fr]">
                    <img src={item.photo} alt="" className="h-40 w-full object-cover sm:h-full" />
                    <div className="grid gap-2 p-4">
                      <h3 className="font-display text-xl font-medium">{item.type}</h3>
                      <p className="text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Incluso: {item.amenities.join(" · ")} · até {item.maxAdults} adulto(s)
                        {item.maxChildren ? ` e ${item.maxChildren} criança(s)` : ""}
                      </p>
                      {overCapacity ? (
                        <p className="rounded-md border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive">
                          Capacidade excedida — este quarto não cabe neste grupo.
                        </p>
                      ) : (
                        <div className="grid gap-0.5">
                          <p className="font-display text-2xl font-medium tabular-nums">
                            {formatCurrency(item.quote?.averageNight ?? 0)}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">/ noite</span>
                          </p>
                          <p className="text-sm">
                            {item.quote?.nights ?? nights} noite(s) · {formatCurrency(item.quote?.total ?? 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">{occupancyGridLabel(adults, children)}</p>
                          {periodOk ? (
                            <p
                              className={
                                item.free === 0
                                  ? "text-sm font-medium text-destructive"
                                  : "text-sm font-medium"
                              }
                            >
                              {item.free === 0
                                ? "Esgotado neste período"
                                : item.free === 1
                                  ? "1 quarto livre"
                                  : `${item.free} quartos livres`}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <Button
                        type="button"
                        className="justify-self-start"
                        variant={soldOut || overCapacity ? "outline" : "default"}
                        disabled={soldOut || overCapacity}
                        onClick={() => chooseType(item.type)}
                      >
                        {overCapacity ? "Capacidade excedida" : soldOut ? "Indisponível" : "Continuar"}
                      </Button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
