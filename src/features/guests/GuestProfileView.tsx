import { Link } from "@tanstack/react-router";
import { formatCurrency, formatStayRange, roomById } from "@/mocks/hotelData";
import { FolioStatement } from "@/features/reservations/components/FolioStatement";
import { STATUS_LABEL } from "@/features/reservations/status";
import { useGuestProfile } from "./useGuests";

export function GuestProfileView({ guestId }: { guestId: string }) {
  const { data } = useGuestProfile(guestId);

  if (!data) {
    return <p className="text-sm text-muted-foreground">Hóspede não encontrado.</p>;
  }

  const { guest, stays, ltv, stayCount } = data;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        <Link to="/hospedes" className="text-muted-foreground hover:text-foreground">
          Hóspedes
        </Link>
        <span className="text-muted-foreground"> / </span>
        {guest.name}
      </p>

      <header className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ficha</p>
        <h1 className="font-display text-3xl font-medium tracking-tight">{guest.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {guest.email} · {guest.phone} · CPF {guest.cpf}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {guest.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
        <p className="font-display mt-4 text-2xl font-medium tabular-nums">{formatCurrency(ltv)}</p>
        <p className="text-xs text-muted-foreground uppercase">LTV · {stayCount} estadias</p>
      </header>

      {guest.preferences.length > 0 || guest.notes ? (
        <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-medium tracking-tight">Preferências</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {guest.preferences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {guest.notes ? <p className="mt-3 text-sm">{guest.notes}</p> : null}
        </section>
      ) : null}

      <section className="rounded-xl bg-card shadow-[var(--shadow-border)]">
        <h2 className="font-display px-5 pt-5 text-xl font-medium tracking-tight">
          Histórico de estadias
        </h2>
        <ol className="mt-2 divide-y divide-border">
          {stays.map((stay) => {
            const room = roomById(stay.reservation.roomId);
            return (
              <li key={stay.reservation.id} className="px-5 py-4">
                <p className="font-medium">
                  {formatStayRange(stay.reservation.checkIn, stay.reservation.checkOut)}
                </p>
                <p className="mb-3 text-sm text-muted-foreground">
                  Quarto {room?.number ?? "—"} · {STATUS_LABEL[stay.reservation.status]}
                </p>
                <FolioStatement linhas={stay.folio.linhas} totais={stay.folio.totais} />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
