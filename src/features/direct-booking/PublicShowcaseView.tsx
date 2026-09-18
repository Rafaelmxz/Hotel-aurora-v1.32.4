import { useMemo, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TODAY_ISO,
  formatCurrency,
  rooms,
  stayNights,
  type Reservation,
  type RoomType,
} from "@/mocks/hotelData";
import { useProperty } from "@/features/settings/useProperty";
import { quoteStay } from "@/features/rates/pricing";
import { availableRoomsByType } from "@/features/reservations/overbooking";
import { useCreatePublicReservation, useReservations } from "@/features/reservations/useReservations";
import { useRooms } from "@/features/rooms/useRooms";
import { useBookingConfig } from "@/features/direct-booking/useBookingEngine";
import { StayVoucher } from "@/features/reservations/components/StayVoucher";
import { getFolio } from "@/features/reservations/folioStore";
import { PixCharge, pixNote } from "@/features/finance/PixCharge";
import { pixTxid } from "@/lib/pix/brcode";
import { PROPERTY_AMENITIES, ROOM_CATALOG, extraStory } from "./catalog";
import {
  EXTRA_UNIT_LABEL,
  extraQuantity,
  quoteExtras,
  type BookingExtra,
} from "./bookingStore";

type Step = "vitrine" | "pagamento" | "voucher";

function scrollToExperiences() {
  window.setTimeout(() => {
    document.getElementById("experiencias")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
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
  if (!extras.length) return null;
  return (
    <section id="experiencias" className="scroll-mt-40">
      <h2 className="font-display mt-8 text-2xl font-medium tracking-tight">Experiências</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Serviços à parte da diária. Inclua os que quiser; o valor entra na conta da reserva.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {extras.map((item) => {
          const story = extraStory(item.id);
          const picked = extraIds.includes(item.id);
          const qty = extraQuantity(item, nights, guests);
          const stayTotal = item.price * qty;
          return (
            <article
              key={item.id}
              className={cn(
                "overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] transition-shadow",
                picked && "ring-2 ring-primary",
              )}
            >
              <img src={story.photo} alt="" className="h-40 w-full object-cover" />
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
                  onClick={() => onToggle(item.id)}
                >
                  {picked ? "Remover" : "Incluir na reserva"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function PublicShowcaseView() {
  const { data: config } = useBookingConfig();
  const { data: property } = useProperty();
  const { data: reservations = [] } = useReservations();
  const { data: roomList = [] } = useRooms();
  const create = useCreatePublicReservation();
  const [checkIn, setCheckIn] = useState(TODAY_ISO);
  const [checkOut, setCheckOut] = useState(TODAY_ISO);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [searched, setSearched] = useState(false);
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
  const nights = stayNights(checkIn, checkOut);
  const available = useMemo(
    () => availableRoomsByType(reservations, checkIn, checkOut, roomList.length ? roomList : rooms),
    [reservations, checkIn, checkOut, roomList],
  );

  const catalog = ROOM_CATALOG.map((item) => {
    const free = (available[item.type] ?? []).filter((room) => room.capacity >= occupancy);
    const quote = checkIn && checkOut ? quoteStay(item.type, checkIn, checkOut, { pax: adults }) : null;
    return { ...item, free: free.length, quote, rooms: free };
  });

  const selected = catalog.find((item) => item.type === roomType);
  const quote =
    roomType && checkIn && checkOut
      ? quoteStay(roomType, checkIn, checkOut, { pax: adults, pix: payMode === "pix" })
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
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      toast.error("Informe um período válido de check-in e check-out.");
      return;
    }
    setSearched(true);
    setStep("vitrine");
    setVoucher(null);
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
    setStep("pagamento");
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

  function backToExperiences() {
    setStep("vitrine");
    scrollToExperiences();
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
        ? quoteStay(roomType, checkIn, checkOut, { pax: adults, pix: payMode === "pix" })
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

  return (
    <div className="-mx-4 flex min-w-0 flex-col sm:-mx-6">
      <form
        onSubmit={onSearch}
        className="sticky top-[3.6rem] z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6"
      >
        <div className="mx-auto grid max-w-5xl gap-2 sm:grid-cols-5">
          <div className="grid gap-1">
            <Label className="text-xs">Check-in</Label>
            <Input type="date" required min={TODAY_ISO} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Check-out</Label>
            <Input type="date" required min={checkIn} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Adultos</Label>
            <Input
              type="number"
              min={1}
              max={6}
              value={adults}
              onChange={(event) => setAdults(Math.max(1, Number(event.target.value) || 1))}
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
          <Button type="submit" className="self-end">
            Buscar disponibilidade
          </Button>
        </div>
      </form>

      {step === "voucher" && voucher ? (
        <div className="mx-auto mt-6 w-full max-w-xl px-4 pb-10 sm:px-6">
          <StayVoucher
            reservation={voucher.reservation}
            roomLabel={voucher.roomLabel}
            hotelName={property.name}
            address={property.address}
            phone={property.phone}
            checkInTime={config.checkInTime}
            checkOutTime={config.checkOutTime}
            cancellationPolicy={config.cancellationPolicy}
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
      ) : step === "pagamento" && selected ? (
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-6 w-full max-w-xl px-4 pb-10 sm:px-6"
        >
          <button
            type="button"
            className="mb-4 text-sm underline"
            onClick={() => setStep("vitrine")}
          >
            ← Voltar ao catálogo
          </button>
          <img src={selected.photo} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
          <h2 className="font-display text-2xl font-medium tracking-tight">{selected.type}</h2>
          <p className="text-sm text-muted-foreground">
            {occupancy} hóspede(s) · {quote?.nights} noites · diárias {formatCurrency(quote?.total ?? 0)}
            {extrasTotal > 0 ? ` · experiências ${formatCurrency(extrasTotal)}` : ""}
            {payMode === "pix" ? ` · sinal ${formatCurrency(deposit)}` : ""}
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
            {extraCatalog.length ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Experiências</p>
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
                    <li className="flex justify-between gap-3 font-medium">
                      <span>Total experiências</span>
                      <span className="tabular-nums">{formatCurrency(extrasTotal)}</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma experiência nesta reserva.</p>
                )}
                <button
                  type="button"
                  className="justify-self-start text-sm underline"
                  onClick={backToExperiences}
                >
                  Alterar nas Experiências
                </button>
              </div>
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
            <Button type="submit" disabled={create.isPending}>
              {payMode === "pix" ? "Já paguei o Pix" : "Enviar pré-reserva"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          <img
            src={config.photos[0]}
            alt=""
            className="h-56 w-full rounded-2xl object-cover sm:h-80"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {config.photos.slice(1).map((src) => (
              <img key={src} src={src} alt="" className="h-28 w-full rounded-xl object-cover" />
            ))}
          </div>
          <header className="mt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pousada</p>
            <h1 className="font-display text-4xl font-medium tracking-tight">{property.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
            <p className="text-sm text-muted-foreground">
              Check-in {config.checkInTime} · Check-out {config.checkOutTime}
              {property.phone ? ` · ${property.phone}` : ""}
            </p>
          </header>
          <ul className="mt-4 flex flex-wrap gap-2">
            {PROPERTY_AMENITIES.map((item) => (
              <li
                key={item}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium"
              >
                {item}
              </li>
            ))}
          </ul>

          <h2 className="font-display mt-8 text-2xl font-medium tracking-tight">Quartos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((item) => {
              const soldOut = searched && item.free === 0;
              const maxCap = Math.max(
                item.capacity,
                ...rooms.filter((room) => room.type === item.type).map((room) => room.capacity),
              );
              return (
                <article key={item.type} className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
                  <img src={item.photo} alt="" className="h-40 w-full object-cover" />
                  <div className="grid gap-2 p-4">
                    <h3 className="font-medium">{item.type}</h3>
                    <p className="text-xs text-muted-foreground">Até {maxCap} pessoas</p>
                    <p className="text-sm">{item.description}</p>
                    {searched ? (
                      <p className="text-sm">
                        {soldOut
                          ? "Esgotado neste período"
                          : `${item.free} livre(s) · a partir de ${formatCurrency(item.quote?.averageNight ?? 0)}`}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant={soldOut ? "outline" : "default"}
                      disabled={soldOut}
                      onClick={() => chooseType(item.type)}
                    >
                      {soldOut ? "Indisponível" : "Escolher e pagar"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <ExperienceCards
            extras={extraCatalog}
            extraIds={extraIds}
            nights={nights}
            guests={occupancy}
            searched={searched}
            onToggle={toggleExtra}
          />
        </div>
      )}
    </div>
  );
}
