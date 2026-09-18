import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Check, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TODAY_ISO, type HousekeepingStatus } from "@/mocks/hotelData";
import {
  HOUSEKEEPING_DOT,
  HOUSEKEEPING_LABEL,
  HOUSEKEEPING_ORDER,
} from "@/features/rooms/housekeeping";
import { usePatchHousekeeping, useRooms } from "@/features/rooms/useRooms";
import type { RoomState } from "@/features/rooms/roomStore";
import { useReservations } from "@/features/reservations/useReservations";

const FILTERS: Array<HousekeepingStatus | "todos"> = [
  "todos",
  "sujo",
  "em_limpeza",
  "limpo",
  "manutencao",
];

const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = {
  todos: "Todos",
  sujo: "Sujo",
  em_limpeza: "Em limpeza",
  limpo: "Limpo",
  manutencao: "Manutenção",
};

export function HousekeepingView() {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useReservations();
  const patch = usePatchHousekeeping();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("sujo");
  const [noteRoomId, setNoteRoomId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const checkInToday = useMemo(() => {
    const set = new Set<string>();
    for (const reservation of reservations) {
      if (
        reservation.checkIn === TODAY_ISO &&
        reservation.status !== "cancelada" &&
        reservation.status !== "check-out"
      ) {
        set.add(reservation.roomId);
      }
    }
    return set;
  }, [reservations]);

  const counts = useMemo(() => {
    const next: Record<HousekeepingStatus, number> = {
      sujo: 0,
      em_limpeza: 0,
      limpo: 0,
      manutencao: 0,
    };
    for (const room of rooms) next[room.housekeepingStatus] += 1;
    return next;
  }, [rooms]);

  const visible = rooms.filter(
    (room) => filter === "todos" || room.housekeepingStatus === filter,
  );

  async function setStatus(room: RoomState, housekeepingStatus: HousekeepingStatus, extraNote?: string) {
    try {
      await patch.mutateAsync({
        id: room.id,
        housekeepingStatus,
        note: extraNote,
      });
      toast.success(`Quarto ${room.number} · ${HOUSEKEEPING_LABEL[housekeepingStatus]}`);
      setNoteRoomId(null);
      setNote("");
    } catch {
      toast.error("Não foi possível atualizar o quarto.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Governança
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight">Limpeza de quartos</h1>
        <p className="text-sm text-muted-foreground">
          Toque uma vez para avançar o status. O mapa da recepção atualiza na hora.
        </p>
      </header>

      <div className="sticky top-[3.75rem] z-20 -mx-4 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur-sm sm:static sm:mx-0 sm:overflow-visible sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex min-w-max gap-2 sm:flex-wrap">
          {FILTERS.map((item) => {
            const count = item === "todos" ? rooms.length : counts[item];
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {item !== "todos" ? (
                  <span className={cn("size-2.5 rounded-full", HOUSEKEEPING_DOT[item])} />
                ) : null}
                {FILTER_LABEL[item]}
                <span className="tabular-nums opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-[var(--shadow-border)]">
          Nenhum quarto neste status.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((room) => {
            const priority = checkInToday.has(room.id);
            const status = room.housekeepingStatus;
            return (
              <li
                key={room.id}
                className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl font-medium tracking-tight tabular-nums">
                      {room.number}
                    </p>
                    <p className="text-sm text-muted-foreground">{room.type}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    <span className={cn("size-2 rounded-full", HOUSEKEEPING_DOT[status])} />
                    {HOUSEKEEPING_LABEL[status]}
                  </span>
                </div>

                {priority ? (
                  <p className="inline-flex items-center gap-2 rounded-lg bg-status-pending/10 px-3 py-2 text-sm font-medium text-status-pending">
                    <AlertTriangle className="size-4" />
                    Check-in previsto hoje
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem chegada hoje</p>
                )}

                {room.housekeepingNote ? (
                  <p className="text-sm">{room.housekeepingNote}</p>
                ) : null}
                {room.cleaningStartedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Limpeza desde {format(new Date(room.cleaningStartedAt), "HH:mm")}
                  </p>
                ) : null}

                <div className="mt-auto grid gap-2">
                  {status === "sujo" ? (
                    <Button
                      className="h-12"
                      disabled={patch.isPending}
                      onClick={() => setStatus(room, "em_limpeza")}
                    >
                      <Sparkles className="size-4" />
                      Iniciar limpeza
                    </Button>
                  ) : null}
                  {status === "em_limpeza" ? (
                    <Button
                      className="h-12"
                      disabled={patch.isPending}
                      onClick={() => setStatus(room, "limpo")}
                    >
                      <Check className="size-4" />
                      Marcar limpo
                    </Button>
                  ) : null}
                  {status === "manutencao" ? (
                    <Button
                      className="h-12"
                      disabled={patch.isPending}
                      onClick={() => setStatus(room, "limpo")}
                    >
                      Liberar quarto
                    </Button>
                  ) : null}
                  {status !== "manutencao" ? (
                    noteRoomId === room.id ? (
                      <div className="grid gap-2">
                        <Textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Ex.: ar-condicionado com defeito"
                        />
                        <Button
                          variant="outline"
                          className="h-11"
                          disabled={patch.isPending}
                          onClick={() =>
                            setStatus(room, "manutencao", note.trim() || "Manutenção")
                          }
                        >
                          Confirmar manutenção
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-11"
                        onClick={() => {
                          setNoteRoomId(room.id);
                          setNote(room.housekeepingNote ?? "");
                        }}
                      >
                        <Wrench className="size-4" />
                        Manutenção
                      </Button>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Status: {HOUSEKEEPING_ORDER.map((item) => HOUSEKEEPING_LABEL[item]).join(" · ")}
      </p>
    </div>
  );
}
