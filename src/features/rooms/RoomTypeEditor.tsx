import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { occupancyOfType, type RoomTypeProfile } from "./roomTypeStore";
import { useRoomTypes, useSaveRoomTypes } from "./useRoomTypes";

export function RoomTypeEditor() {
  const { data } = useRoomTypes();
  const save = useSaveRoomTypes();
  const [rows, setRows] = useState<RoomTypeProfile[]>(data);

  useEffect(() => {
    setRows(data);
  }, [data]);

  function patch(type: RoomTypeProfile["type"], next: Partial<RoomTypeProfile>) {
    setRows((current) => current.map((row) => (row.type === type ? { ...row, ...next } : row)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync(rows);
      toast.success("Tipos de quarto salvos");
    } catch {
      toast.error("Não foi possível salvar os tipos.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight">Tipos de quarto</h2>
        <p className="text-sm text-muted-foreground">
          Foto, texto, comodidades e ocupação. Vale no site. Não muda o preço.
        </p>
      </div>
      {rows.map((row) => (
        <fieldset key={row.type} className="grid gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">{row.type}</legend>
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <img src={row.photo} alt="" className="h-24 w-full rounded-md object-cover" />
            <div className="grid gap-2">
              <Label>Foto (URL)</Label>
              <Input
                value={row.photo}
                onChange={(event) => patch(row.type, { photo: event.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={row.description}
              onChange={(event) => patch(row.type, { description: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Comodidades (uma por linha)</Label>
            <Textarea
              rows={3}
              value={row.amenities.join("\n")}
              onChange={(event) =>
                patch(row.type, {
                  amenities: event.target.value.split("\n").map((item) => item.trim()),
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Adultos</Label>
              <Input
                inputMode="numeric"
                value={String(row.maxAdults)}
                onChange={(event) =>
                  patch(row.type, { maxAdults: Number(event.target.value) || 1 })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Crianças</Label>
              <Input
                inputMode="numeric"
                value={String(row.maxChildren)}
                onChange={(event) =>
                  patch(row.type, { maxChildren: Number(event.target.value) || 0 })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Até {occupancyOfType(row)} pessoas no tipo.</p>
        </fieldset>
      ))}
      <Button type="submit" className="self-start" disabled={save.isPending}>
        Salvar tipos de quarto
      </Button>
    </form>
  );
}
