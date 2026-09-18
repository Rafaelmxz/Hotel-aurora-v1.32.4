import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LogIn, LogOut, Ban, Clock, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatStayRange,
  roomById,
  type Reservation,
  type ReservationStatus,
} from "@/mocks/hotelData";
import { ReservationFolio } from "./components/ReservationFolio";
import { ReservationPaymentModal } from "./components/ReservationPaymentModal";
import { StayVoucher } from "./components/StayVoucher";
import { STATUS_BADGE, STATUS_LABEL } from "./status";
import { syncReservationQueries, usePatchReservation } from "./useReservations";
import { useFolio } from "./hooks/useFolio";
import { notesSayPayAtCheckIn } from "./types/folio";
import { useMarkRoomDirty, useRooms } from "@/features/rooms/useRooms";
import { blocksCheckIn, HOUSEKEEPING_LABEL } from "@/features/rooms/housekeeping";
import { findGuestByName, guestIdFromName } from "@/features/guests/guestStore";
import { useBookingConfig } from "@/features/direct-booking/useBookingEngine";
import { useProperty } from "@/features/settings/useProperty";

function nowLocal() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function fromDateTimeLocal(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

const ACTIONS: {
  status: ReservationStatus;
  label: string;
  hint: string;
  icon: typeof LogIn;
  variant: "default" | "secondary" | "destructive";
}[] = [
  {
    status: "check-in",
    label: "Em check-in",
    hint: "Hóspede no hotel",
    icon: LogIn,
    variant: "default",
  },
  {
    status: "check-out",
    label: "Checked-out",
    hint: "Saída registrada",
    icon: LogOut,
    variant: "secondary",
  },
  {
    status: "cancelada",
    label: "Cancelado",
    hint: "Libera o quarto",
    icon: Ban,
    variant: "destructive",
  },
];

type TabId = "atendimento" | "extrato" | "voucher";

export function CheckInModal({
  reservation,
  onOpenChange,
}: {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const patch = usePatchReservation();
  const queryClient = useQueryClient();
  const markDirty = useMarkRoomDirty();
  const { data: rooms = [] } = useRooms();
  const [tab, setTab] = useState<TabId>("atendimento");
  const [checkInAt, setCheckInAt] = useState("");
  const [checkOutAt, setCheckOutAt] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [localStatus, setLocalStatus] = useState<ReservationStatus | null>(null);
  const folio = useFolio(reservation?.id);
  const { data: bookingConfig } = useBookingConfig();
  const { data: property } = useProperty();
  const displayStatus = localStatus ?? reservation?.status ?? "pendente";
  const isPreReservation = displayStatus === "pendente";

  useEffect(() => {
    if (!reservation) {
      setLocalStatus(null);
      return;
    }
    setTab("atendimento");
    setCheckInAt(toDateTimeLocal(reservation.actualCheckInAt) || nowLocal());
    setCheckOutAt(toDateTimeLocal(reservation.actualCheckOutAt));
    setNotes(reservation.receptionNotes ?? "");
    setLocalStatus(reservation.status);
  }, [reservation?.id]);

  const room = reservation ? roomById(reservation.roomId) : undefined;
  const roomState = rooms.find((item) => item.id === reservation?.roomId);
  const housekeepingBlocked = roomState
    ? blocksCheckIn(roomState.housekeepingStatus)
    : false;
  const guestProfile = reservation ? findGuestByName(reservation.guestName) : undefined;

  async function completeCheckout() {
    if (!reservation) return;
    const payload = {
      id: reservation.id,
      status: "check-out" as const,
      receptionNotes: notes.trim() || undefined,
      actualCheckInAt: fromDateTimeLocal(checkInAt || nowLocal()) ?? reservation.actualCheckInAt,
      actualCheckOutAt: fromDateTimeLocal(checkOutAt || nowLocal()),
    };
    await patch.mutateAsync(payload);
    await markDirty.mutateAsync(reservation.roomId);
    setCheckoutPending(false);
    toast.success(`Checked-out · ${reservation.guestName} · quarto sujo`);
  }

  async function confirmPreReservation() {
    if (!reservation) return;
    const payAtCheckIn = notesSayPayAtCheckIn(reservation.notes);
    const deposit = Math.max(
      1,
      Math.round(reservation.totalAmount * (bookingConfig.depositPercent / 100)),
    );
    try {
      const updated = await patch.mutateAsync({
        id: reservation.id,
        status: "confirmada",
        receptionNotes: notes.trim() || undefined,
      });
      if (!payAtCheckIn) {
        await folio.addPayment.mutateAsync({
          valor: deposit,
          metodo: "pix",
          descricao: "Sinal da pré-reserva",
          observacao: `Sinal da pré-reserva (${bookingConfig.depositPercent}%)`,
        });
      }
      await syncReservationQueries(queryClient, updated);
      setLocalStatus("confirmada");
      toast.success(
        payAtCheckIn
          ? "Reserva confirmada · pagamento no check-in"
          : `Reserva confirmada · sinal de ${formatCurrency(deposit)} no extrato`,
      );
    } catch {
      toast.error("Não foi possível confirmar a pré-reserva.");
    }
  }

  async function applyStatus(status: ReservationStatus) {
    if (!reservation) return;

    if (status === "check-out") {
      const saldo = Math.round(folio.totais.saldo);
      if (saldo > 0) {
        setCheckoutPending(true);
        setPaymentOpen(true);
        toast.warning(`Saldo pendente de ${formatCurrency(saldo)}. Quite a conta para concluir.`);
        return;
      }
      try {
        await completeCheckout();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a reserva.");
      }
      return;
    }

    if (status === "check-in") {
      if (housekeepingBlocked) {
        toast.warning(
          `Quarto ${roomState?.number ?? ""} está ${HOUSEKEEPING_LABEL[roomState!.housekeepingStatus]}. Libere na governança antes do check-in.`,
        );
        return;
      }
    }

    const payload = {
      id: reservation.id,
      status,
      receptionNotes: notes.trim() || undefined,
      actualCheckInAt:
        status === "check-in"
          ? fromDateTimeLocal(checkInAt || nowLocal())
          : reservation.actualCheckInAt,
      actualCheckOutAt:
        status === "cancelada" ? reservation.actualCheckOutAt : undefined,
    };

    try {
      await patch.mutateAsync(payload);
      setLocalStatus(status);
      toast.success(`${STATUS_LABEL[status]} · ${reservation.guestName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a reserva.");
    }
  }

  return (
    <Sheet
      open={Boolean(reservation)}
      onOpenChange={(open) => {
        if (!open) {
          setTab("atendimento");
          setPaymentOpen(false);
          setCheckoutPending(false);
        }
        onOpenChange(open);
      }}
    >
      <SheetContent className="max-h-dvh overflow-y-auto sm:max-w-lg">
        {reservation ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_BADGE[displayStatus]}>
                  {STATUS_LABEL[displayStatus]}
                </Badge>
                {room ? (
                  <span className="text-xs text-muted-foreground">
                    Quarto {room.number} · {room.type}
                  </span>
                ) : null}
              </div>
              <SheetTitle>Recepção</SheetTitle>
              <SheetDescription>
                {reservation.guestName} · {formatStayRange(reservation.checkIn, reservation.checkOut)}
                {" · "}
                <Link
                  to="/hospedes/$guestId"
                  params={{ guestId: guestIdFromName(reservation.guestName) }}
                  className="underline underline-offset-2"
                >
                  Ficha do hóspede
                </Link>
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8">
              <div className="grid grid-cols-3 rounded-full bg-secondary p-1">
                <button
                  type="button"
                  className={cn(
                    "h-9 rounded-full text-sm font-medium",
                    tab === "atendimento"
                      ? "bg-card text-foreground shadow-[var(--shadow-border)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTab("atendimento")}
                >
                  Atendimento
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-9 rounded-full text-sm font-medium",
                    tab === "extrato"
                      ? "bg-card text-foreground shadow-[var(--shadow-border)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTab("extrato")}
                >
                  Conta
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-9 rounded-full text-sm font-medium",
                    tab === "voucher"
                      ? "bg-card text-foreground shadow-[var(--shadow-border)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setTab("voucher")}
                >
                  Voucher
                </button>
              </div>

              {tab === "atendimento" ? (
                <div className="flex flex-col gap-5">
                  {housekeepingBlocked && roomState ? (
                    <div className="flex gap-2 rounded-lg bg-status-pending/10 px-3 py-3 text-sm text-status-pending">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <p>
                        Quarto {roomState.number} está{" "}
                        <strong>{HOUSEKEEPING_LABEL[roomState.housekeepingStatus]}</strong>
                        {roomState.housekeepingNote ? ` · ${roomState.housekeepingNote}` : ""}.
                        Check-in bloqueado até a governança marcar Limpo.
                      </p>
                    </div>
                  ) : null}
                  {guestProfile &&
                  (guestProfile.preferences.length > 0 || guestProfile.tags.includes("Inadimplente") || guestProfile.tags.includes("VIP")) ? (
                    <div className="rounded-lg bg-secondary px-3 py-3 text-sm">
                      <p className="font-medium">{guestProfile.tags.join(" · ")}</p>
                      <p className="text-muted-foreground">
                        {guestProfile.preferences.join(" · ") || guestProfile.notes}
                      </p>
                    </div>
                  ) : null}
                  {isPreReservation ? (
                    <section className="grid gap-3 rounded-xl bg-status-pending/10 p-4">
                      <p className="text-sm font-medium text-status-pending">
                        Pré-reserva aguardando confirmação da recepção
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reservation.notes ?? "Confirme para ocupar o quarto."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notesSayPayAtCheckIn(reservation.notes)
                          ? "Pagamento no check-in — confirmar não lança sinal."
                          : "Confirme o comprovante para lançar o sinal e ocupar o quarto."}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          className="bg-status-checkout text-status-checkout-fg hover:opacity-90"
                          disabled={patch.isPending || folio.addPayment.isPending}
                          onClick={() => void confirmPreReservation()}
                        >
                          Confirmar reserva
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={patch.isPending}
                          onClick={() => void applyStatus("cancelada")}
                        >
                          Recusar / Cancelar pré-reserva
                        </Button>
                      </div>
                    </section>
                  ) : (
                  <section>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Um clique
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {ACTIONS.map((action) => {
                        const Icon = action.icon;
                        const active = displayStatus === action.status;
                        return (
                          <button
                            key={action.status}
                            type="button"
                            disabled={patch.isPending}
                            onClick={() => applyStatus(action.status)}
                            className={cn(
                              "flex min-h-11 flex-col items-start gap-1 rounded-lg px-3 py-3 text-left transition-colors duration-150",
                              action.variant === "default" &&
                                "bg-primary text-primary-foreground hover:bg-primary/90",
                              action.variant === "secondary" &&
                                "bg-status-checkout text-status-checkout-fg hover:opacity-90",
                              action.variant === "destructive" &&
                                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                              active && "ring-2 ring-ring ring-offset-2 ring-offset-card",
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                              <Icon className="size-4" strokeWidth={1.75} />
                              {action.label}
                            </span>
                            <span className="text-xs opacity-80">{action.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  )}

                  <section className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="actual-check-in">Horário real de entrada</Label>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="actual-check-in"
                          type="datetime-local"
                          className="pl-10"
                          value={checkInAt}
                          onChange={(event) => setCheckInAt(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="actual-check-out">Horário real de saída</Label>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="actual-check-out"
                          type="datetime-local"
                          className="pl-10"
                          value={checkOutAt}
                          onChange={(event) => setCheckOutAt(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reception-notes">Observações da recepção</Label>
                      <Textarea
                        id="reception-notes"
                        placeholder="Ex.: documento conferido, late check-out autorizado…"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </div>
                  </section>

                  <p className="text-xs text-muted-foreground">
                    Os horários e as notas são gravados junto com o status. O mapa
                    muda de cor na hora.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={patch.isPending}
                    onClick={() => applyStatus(reservation.status)}
                  >
                    Salvar horários e notas
                  </Button>
                </div>
              ) : tab === "voucher" ? (
                <StayVoucher
                  reservation={reservation}
                  roomLabel={
                    room ? `Quarto ${room.number} · ${room.type}` : reservation.roomId
                  }
                  hotelName={property.name}
                  address={property.address}
                  phone={property.phone}
                  checkInTime={bookingConfig.checkInTime}
                  checkOutTime={bookingConfig.checkOutTime}
                  cancellationPolicy={bookingConfig.cancellationPolicy}
                  totais={folio.totais}
                />
              ) : (
                <ReservationFolio
                  reservationId={reservation.id}
                  onRegisterPayment={() => setPaymentOpen(true)}
                />
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
      {reservation ? (
        <ReservationPaymentModal
          reservationId={reservation.id}
          guestName={reservation.guestName}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSettled={async (saldo) => {
            if (checkoutPending && saldo <= 0) {
              try {
                await completeCheckout();
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Pagamento ok, mas o check-out falhou.",
                );
              }
            }
          }}
        />
      ) : null}
    </Sheet>
  );
}
