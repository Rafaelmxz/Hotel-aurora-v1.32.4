import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useProperty } from "@/features/settings/useProperty";
import { formatCurrency } from "@/mocks/hotelData";
import { BookingEngineModal } from "./BookingEngineModal";
import { EXTRA_UNIT_LABEL } from "./bookingStore";
import { useBookingConfig } from "./useBookingEngine";

export function BookingEngineView() {
  const { data: config } = useBookingConfig();
  const { data: property } = useProperty();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Configuração
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">Motor de reservas</h1>
          <p className="text-sm text-muted-foreground">
            Página do {property.name} para o hóspede reservar sozinho.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/reservar">Abrir visão do hóspede</Link>
          </Button>
          <Button onClick={() => setOpen(true)}>Configurar página</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {config.photos.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            className="h-40 w-full rounded-xl object-cover shadow-[var(--shadow-border)]"
          />
        ))}
      </div>
      <dl className="grid gap-2 rounded-xl bg-card p-5 text-sm shadow-[var(--shadow-border)] sm:grid-cols-2">
        <dt className="text-muted-foreground">Check-in / Check-out</dt>
        <dd className="sm:text-right">
          {config.checkInTime} / {config.checkOutTime}
        </dd>
        <dt className="text-muted-foreground">Cancelamento gratuito</dt>
        <dd className="sm:text-right">{property.cancelFreeHours}h antes</dd>
        <dt className="text-muted-foreground">Pix</dt>
        <dd className="sm:text-right">{config.pixKey}</dd>
        <dt className="text-muted-foreground">Sinal</dt>
        <dd className="sm:text-right">{config.depositPercent}%</dd>
        <dt className="text-muted-foreground">Cancelamento</dt>
        <dd className="sm:col-span-2">
          {property.cancellationPolicy}{" "}
          <span className="text-muted-foreground">Editar em Hotel.</span>
        </dd>
        <dt className="text-muted-foreground">Experiências</dt>
        <dd className="sm:col-span-2">
          {(config.extras ?? []).filter((item) => item.enabled).length
            ? (config.extras ?? [])
                .filter((item) => item.enabled)
                .map(
                  (item) =>
                    `${item.name} · ${formatCurrency(item.price)} ${EXTRA_UNIT_LABEL[item.unit]}`,
                )
                .join(" · ")
            : "Nenhuma experiência no site"}
        </dd>
      </dl>
      <BookingEngineModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
