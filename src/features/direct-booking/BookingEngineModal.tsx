import { useEffect, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBookingConfig, useSaveBookingConfig } from "./useBookingEngine";
import { EXTRA_UNIT_LABEL, normalizeExtras, type BookingExtra } from "./bookingStore";

export function BookingEngineModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: config } = useBookingConfig();
  const save = useSaveBookingConfig();
  const [photos, setPhotos] = useState(config.photos.join("\n"));
  const [pixKey, setPixKey] = useState(config.pixKey);
  const [deposit, setDeposit] = useState(String(config.depositPercent));
  const [extras, setExtras] = useState<BookingExtra[]>(() => normalizeExtras(config.extras));

  useEffect(() => {
    if (!open) return;
    setPhotos(config.photos.join("\n"));
    setPixKey(config.pixKey);
    setDeposit(String(config.depositPercent));
    setExtras(normalizeExtras(config.extras));
  }, [open, config]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...config,
        photos: photos.split("\n"),
        pixKey,
        depositPercent: Number(deposit) || 0,
        extras: normalizeExtras(extras),
      });
      toast.success("Página pública atualizada");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/reservar`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/40" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[70] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6">
          <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
            Configurar página pública
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            Fotos, Pix e experiências da reserva. Horários e cancelamento ficam em Hotel.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 hover:opacity-100">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="photos">Fotos (uma URL por linha)</Label>
              <Textarea id="photos" rows={4} value={photos} onChange={(event) => setPhotos(event.target.value)} />
            </div>
            <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              Check-in {config.checkInTime} · check-out {config.checkOutTime}. {config.cancellationPolicy}{" "}
              Alterar em Hotel.
            </p>
            <div className="grid gap-2">
              <Label>Chave Pix</Label>
              <Input value={pixKey} onChange={(event) => setPixKey(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Sinal de garantia (%)</Label>
              <Input inputMode="numeric" value={deposit} onChange={(event) => setDeposit(event.target.value)} />
            </div>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">Experiências no site</legend>
              {extras.map((item, index) => (
                <div key={item.id} className="grid gap-2 rounded-lg bg-secondary/40 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        setExtras((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, enabled: event.target.checked } : row,
                          ),
                        )
                      }
                    />
                    Oferecer na reserva
                  </label>
                  <Input
                    value={item.name}
                    onChange={(event) =>
                      setExtras((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, name: event.target.value } : row,
                        ),
                      )
                    }
                  />
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Preço (R$)</Label>
                      <Input
                        inputMode="numeric"
                        value={String(item.price)}
                        onChange={(event) =>
                          setExtras((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, price: Number(event.target.value) || 0 }
                                : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <p className="pb-2 text-xs text-muted-foreground">{EXTRA_UNIT_LABEL[item.unit]}</p>
                  </div>
                </div>
              ))}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void copyLink()}>
                Copiar link público
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
