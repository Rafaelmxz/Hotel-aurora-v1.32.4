import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProperty, useSaveProperty } from "./useProperty";
import type { OverbookingMode, PropertyProfile } from "./propertyStore";
import { alignCancellationPolicy } from "./propertyStore";
import { EmailOutbox } from "./EmailOutbox";
import { RoomTypeEditor } from "@/features/rooms/RoomTypeEditor";
import { InventoryHoldsPanel } from "./InventoryHoldsPanel";

export function HotelSettingsView() {
  const { data } = useProperty();
  const save = useSaveProperty();
  const [form, setForm] = useState<PropertyProfile>(data);

  useEffect(() => {
    setForm(data);
  }, [data]);

  function patch<K extends keyof PropertyProfile>(key: K, value: PropertyProfile[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success("Configurações da propriedade salvas");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <header>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Propriedade
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">Hotel</h1>
          <p className="text-sm text-muted-foreground">
            Dados do hotel, branding e regras operacionais do estabelecimento.
          </p>
        </header>

        <section className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-medium tracking-tight">Perfil</h2>
          <div className="grid gap-2">
            <Label htmlFor="hotel-name">Nome do estabelecimento</Label>
            <Input
              id="hotel-name"
              required
              value={form.name}
              onChange={(event) => patch("name", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotel-logo">Logo / avatar (URL)</Label>
            <Input
              id="hotel-logo"
              value={form.logoUrl}
              placeholder="https://..."
              onChange={(event) => patch("logoUrl", event.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hotel-cnpj">CNPJ</Label>
              <Input
                id="hotel-cnpj"
                value={form.cnpj}
                onChange={(event) => patch("cnpj", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hotel-phone">Telefone / WhatsApp</Label>
              <Input
                id="hotel-phone"
                value={form.phone}
                onChange={(event) => patch("phone", event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotel-address">Endereço completo</Label>
            <Textarea
              id="hotel-address"
              value={form.address}
              onChange={(event) => patch("address", event.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-medium tracking-tight">Recebimento</h2>
          <div className="grid gap-2">
            <Label htmlFor="pix-key">Chave Pix oficial</Label>
            <Input id="pix-key" value={form.pixKey} onChange={(event) => patch("pixKey", event.target.value)} />
            <p className="text-xs text-muted-foreground">
              E-mail, CPF, CNPJ, telefone ou chave aleatória. O site monta o QR com essa chave e o valor do sinal.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pix-payee">Favorecido</Label>
            <Input
              id="pix-payee"
              value={form.pixPayee}
              onChange={(event) => patch("pixPayee", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pix-info">Instruções de transferência</Label>
            <Textarea
              id="pix-info"
              value={form.transferInstructions}
              onChange={(event) => patch("transferInstructions", event.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-medium tracking-tight">Horários e cancelamento</h2>
          <p className="text-sm text-muted-foreground">
            Vale no site, no voucher e na ficha da reserva. Não muda preço.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="check-in-time">Check-in</Label>
              <Input
                id="check-in-time"
                type="time"
                value={form.checkInTime}
                onChange={(event) => patch("checkInTime", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="check-out-time">Check-out</Label>
              <Input
                id="check-out-time"
                type="time"
                value={form.checkOutTime}
                onChange={(event) => patch("checkOutTime", event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="late">Tolerância na saída (minutos)</Label>
              <Input
                id="late"
                inputMode="numeric"
                value={String(form.lateCheckoutMinutes)}
                onChange={(event) => patch("lateCheckoutMinutes", Number(event.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cancel-hours">Cancelamento gratuito até (horas antes)</Label>
              <Input
                id="cancel-hours"
                inputMode="numeric"
                value={String(form.cancelFreeHours)}
                onChange={(event) => {
                  const hours = Number(event.target.value) || 0;
                  setForm((current) => ({
                    ...current,
                    cancelFreeHours: hours,
                    cancellationPolicy: alignCancellationPolicy(current.cancellationPolicy, hours),
                  }));
                }}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cancel-policy">Texto da regra (hóspede)</Label>
            <Textarea
              id="cancel-policy"
              rows={3}
              maxLength={400}
              value={form.cancellationPolicy}
              onChange={(event) => patch("cancellationPolicy", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="overbook">Política de overbooking</Label>
            <select
              id="overbook"
              className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              value={form.overbookingMode}
              onChange={(event) => patch("overbookingMode", event.target.value as OverbookingMode)}
            >
              <option value="bloquear">Bloquear conflito (recomendado)</option>
              <option value="alertar">Apenas alertar</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deposit">Sinal de pré-reserva</Label>
            <select
              id="deposit"
              className="h-11 rounded-md border border-input bg-card px-3 text-sm"
              value={String(form.depositPercent)}
              onChange={(event) => patch("depositPercent", Number(event.target.value))}
            >
              <option value="30">30%</option>
              <option value="50">50%</option>
              <option value="100">100%</option>
            </select>
          </div>
        </section>

        <Button type="submit" className="self-start" disabled={save.isPending}>
          Salvar propriedade
        </Button>
      </form>
      <InventoryHoldsPanel />
      <RoomTypeEditor />
      <EmailOutbox />
    </div>
  );
}
