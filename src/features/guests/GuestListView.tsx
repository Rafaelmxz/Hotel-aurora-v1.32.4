import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/mocks/hotelData";
import { getGuestStats, searchGuests } from "./guestStore";
import { useGuests } from "./useGuests";

export function GuestListView() {
  const { data: guests = [] } = useGuests();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const filtered = query.trim() ? searchGuests(query) : guests;
    return filtered.map((guest) => getGuestStats(guest));
  }, [guests, query]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fichas</p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Hóspedes</h1>
        <p className="text-sm text-muted-foreground">
          Histórico, preferências e valor de vida (LTV).
        </p>
      </header>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome ou CPF"
      />
      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        {rows.map(({ guest, ltv, stayCount }) => (
          <li key={guest.id}>
            <Link
              to="/hospedes/$guestId"
              params={{ guestId: guest.id }}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/60"
            >
              <div>
                <p className="font-medium">{guest.name}</p>
                <p className="text-sm text-muted-foreground">
                  {guest.cpf} · {stayCount} estadias
                  {guest.tags.length ? ` · ${guest.tags.join(", ")}` : ""}
                </p>
              </div>
              <p className="tabular-nums text-sm font-medium">{formatCurrency(ltv)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
