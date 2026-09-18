import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TODAY_ISO, type RoomType } from "@/mocks/hotelData";
import { useAddPackage, usePackages, useRemovePackage } from "./useRates";
import type { SpecialPackage } from "./rateStore";

const ROOM_FILTER: Array<SpecialPackage["roomType"]> = ["todas", "Standard", "Luxo", "Suíte"];

export function PackagesView() {
  const { data: packages = [] } = usePackages();
  const addPackage = useAddPackage();
  const removePackage = useRemovePackage();
  const [name, setName] = useState("");
  const [start, setStart] = useState(TODAY_ISO);
  const [end, setEnd] = useState(TODAY_ISO);
  const [minNights, setMinNights] = useState("2");
  const [roomType, setRoomType] = useState<SpecialPackage["roomType"]>("todas");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await addPackage.mutateAsync({
        name,
        start,
        end,
        minNights: Math.max(1, Number(minNights) || 1),
        roomType,
      });
      setName("");
      toast.success("Pacote cadastrado");
    } catch {
      toast.error("Não foi possível cadastrar o pacote.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
      >
        <h2 className="font-display text-xl font-medium tracking-tight">Pacote especial</h2>
        <p className="text-sm text-muted-foreground">
          Vinculado a datas com estadia mínima (ex.: mínimo 2 noites).
        </p>
        <div className="grid gap-2">
          <Label>Nome</Label>
          <Input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lua de mel"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Início</Label>
            <Input type="date" required value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Término</Label>
            <Input type="date" required value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Mínimo de noites</Label>
            <Input
              required
              inputMode="numeric"
              value={minNights}
              onChange={(event) => setMinNights(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <select
              className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              value={roomType}
              onChange={(event) => setRoomType(event.target.value as RoomType | "todas")}
            >
              {ROOM_FILTER.map((item) => (
                <option key={item} value={item}>
                  {item === "todas" ? "Todas" : item}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={addPackage.isPending}>
          Cadastrar pacote
        </Button>
      </form>

      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        {packages.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.start} → {item.end} · mín. {item.minNights} noites · {item.roomType}
              </p>
            </div>
            <Button variant="outline" onClick={() => void removePackage.mutateAsync(item.id)}>
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
