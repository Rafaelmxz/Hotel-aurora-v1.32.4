import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HousekeepingStatus } from "@/mocks/hotelData";
import {
  HOUSEKEEPING_DOT,
  HOUSEKEEPING_LABEL,
  HOUSEKEEPING_ORDER,
} from "./housekeeping";
import { usePatchHousekeeping } from "./useRooms";
import type { RoomState } from "./roomStore";

export function HousekeepingMark({
  room,
}: {
  room: RoomState;
  compact?: boolean;
}) {
  const patch = usePatchHousekeeping();
  const status = room.housekeepingStatus;

  async function setStatus(next: HousekeepingStatus) {
    if (next === status) return;
    try {
      await patch.mutateAsync({ id: room.id, housekeepingStatus: next });
      toast.success(`Quarto ${room.number} · ${HOUSEKEEPING_LABEL[next]}`);
    } catch {
      toast.error("Não foi possível atualizar a governança.");
    }
  }

  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span
        className={cn("size-2 shrink-0 rounded-full", HOUSEKEEPING_DOT[status])}
        aria-hidden
      />
      <select
        value={status}
        disabled={patch.isPending}
        aria-label={`Governança do quarto ${room.number}`}
        onChange={(event) => {
          void setStatus(event.target.value as HousekeepingStatus);
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-input bg-card px-1 text-xs text-foreground"
      >
        {HOUSEKEEPING_ORDER.map((option) => (
          <option key={option} value={option}>
            {HOUSEKEEPING_LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
