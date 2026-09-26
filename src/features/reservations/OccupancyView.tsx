import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TODAY,
  TODAY_ISO,
  isStayActiveOn,
  rooms,
  type RoomType,
} from "@/mocks/hotelData";
import { cn } from "@/lib/utils";
import { useReservations } from "./useReservations";

const TYPES: RoomType[] = ["Standard", "Luxo", "Suíte"];
const DAYS = 14;

function toISO(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function OccupancyView() {
  const { data: reservations = [] } = useReservations();
  const [startIso, setStartIso] = useState(TODAY_ISO);
  const start = parseISO(startIso);

  const columns = useMemo(
    () => Array.from({ length: DAYS }, (_, index) => addDays(start, index)),
    [start],
  );

  const inventory = useMemo(() => {
    const byType: Record<RoomType, number> = { Standard: 0, Luxo: 0, Suíte: 0 };
    for (const room of rooms) byType[room.type] += 1;
    return byType;
  }, []);

  const matrix = useMemo(() => {
    return columns.map((day) => {
      const occupiedIds = new Set(
        reservations
          .filter((row) => isStayActiveOn(row, day))
          .map((row) => row.roomId),
      );
      const byType: Record<RoomType, number> = { Standard: 0, Luxo: 0, Suíte: 0 };
      for (const room of rooms) {
        if (!occupiedIds.has(room.id)) byType[room.type] += 1;
      }
      const free = rooms.length - occupiedIds.size;
      const occupancy = Math.round((occupiedIds.size / rooms.length) * 100);
      return { day, occupancy, free, byType };
    });
  }, [columns, reservations]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Disponibilidade
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            Ocupação 14 dias
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStartIso(toISO(addDays(start, -DAYS)))}
          >
            ← 14 dias
          </Button>
          <Input
            type="date"
            className="w-[11.5rem]"
            value={startIso}
            onChange={(event) => setStartIso(event.target.value || TODAY_ISO)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setStartIso(toISO(addDays(start, DAYS)))}
          >
            14 dias →
          </Button>
          <Button type="button" variant="outline" onClick={() => setStartIso(TODAY_ISO)}>
            Hoje
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
        <table className="w-full min-w-[56rem] border-collapse text-center text-sm">
          <thead>
            <tr className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
              <th className="sticky left-0 z-10 bg-secondary px-3 py-3 text-left font-medium">
                Categoria
              </th>
              {matrix.map((col) => (
                <th key={toISO(col.day)} className="px-2 py-3 font-medium">
                  <div className="capitalize">
                    {format(col.day, "EEE d", { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-[11px] normal-case",
                      col.free === 0 ? "font-semibold text-destructive" : "",
                    )}
                  >
                    {col.occupancy}% · {col.free} livre{col.free === 1 ? "" : "s"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map((type) => (
              <tr key={type} className="border-t border-border">
                <th className="sticky left-0 z-10 bg-card px-3 py-3 text-left font-medium">
                  {type}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {inventory[type]} quartos
                  </span>
                </th>
                {matrix.map((col) => {
                  const free = col.byType[type];
                  const soldOut = free === 0;
                  return (
                    <td key={`${type}-${toISO(col.day)}`} className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 text-sm font-medium tabular-nums",
                          soldOut
                            ? "bg-destructive text-white"
                            : "bg-secondary text-foreground",
                        )}
                      >
                        {soldOut ? "0" : free}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Cada célula mostra vagas livres na categoria. Vermelho = lotado (0 vagas).
        Data de referência: {format(TODAY, "dd/MM/yyyy")}.
      </p>
    </div>
  );
}
