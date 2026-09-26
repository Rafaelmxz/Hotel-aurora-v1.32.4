import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Guest } from "./guestStore";
import { useGuestSearch } from "./useGuests";

export function GuestSearch({
  onSelect,
}: {
  onSelect: (guest: Guest) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: results = [] } = useGuestSearch(query);
  const open = query.trim().length >= 2 && results.length > 0;

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nome ou CPF"
        autoComplete="off"
        aria-label="Buscar hóspede"
      />
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card shadow-md">
          {results.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary",
                )}
                onClick={() => {
                  onSelect(guest);
                  setQuery(guest.name);
                }}
              >
                <span className="font-medium">{guest.name}</span>
                <span className="text-xs text-muted-foreground">
                  {guest.cpf} · {guest.tags.join(" · ") || "sem tag"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
