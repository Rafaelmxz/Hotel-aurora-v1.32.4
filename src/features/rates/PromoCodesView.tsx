import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, TODAY_ISO } from "@/mocks/hotelData";
import { useAddPromo, usePromos, useRemovePromo } from "./useRates";
import type { PromoKind } from "./rateStore";

export function PromoCodesView() {
  const { data: promos = [] } = usePromos();
  const addPromo = useAddPromo();
  const removePromo = useRemovePromo();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<PromoKind>("percent");
  const [value, setValue] = useState("10");
  const [start, setStart] = useState(TODAY_ISO);
  const [end, setEnd] = useState(TODAY_ISO);
  const [limit, setLimit] = useState("20");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await addPromo.mutateAsync({
        code,
        kind,
        value: Number(value),
        start,
        end,
        usageLimit: Math.max(1, Number(limit) || 1),
        active: true,
      });
      setCode("");
      toast.success("Cupom cadastrado");
    } catch {
      toast.error("Não foi possível cadastrar o cupom.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
      >
        <h2 className="font-display text-xl font-medium tracking-tight">Novo cupom</h2>
        <div className="grid gap-2">
          <Label>Código</Label>
          <Input
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="CLIENTEVIP"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <select
              className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as PromoKind)}
            >
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Desconto</Label>
            <Input
              required
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Início</Label>
            <Input type="date" required value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Validade</Label>
            <Input type="date" required value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Limite de uso</Label>
          <Input
            required
            inputMode="numeric"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={addPromo.isPending}>
          Cadastrar cupom
        </Button>
      </form>

      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        {promos.map((promo) => (
          <li key={promo.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-medium tracking-wide">{promo.code}</p>
              <p className="text-sm text-muted-foreground">
                {promo.kind === "percent"
                  ? `${promo.value}%`
                  : formatCurrency(promo.value)}{" "}
                · {promo.start} → {promo.end} · {promo.usageCount}/{promo.usageLimit} usos
              </p>
            </div>
            <Button variant="outline" onClick={() => void removePromo.mutateAsync(promo.id)}>
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
