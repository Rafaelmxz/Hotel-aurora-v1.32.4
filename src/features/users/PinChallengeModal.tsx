import { useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "./roles";
import type { StaffUser } from "./userStore";

export function PinChallengeModal({
  open,
  user,
  error,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  user: StaffUser | null;
  error?: string;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm(pin);
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setPin("");
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/40" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6">
          <DialogPrimitive.Title className="font-display text-xl font-medium tracking-tight">
            PIN de segurança
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            Para entrar como {user?.name} ({user ? ROLE_LABEL[user.role] : ""}) informe o PIN de 4
            dígitos.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 hover:opacity-100">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="staff-pin">Senha master / PIN</Label>
              <Input
                id="staff-pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                pattern="\d{4}"
                placeholder="••••"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending || pin.length !== 4}>
              Confirmar acesso
            </Button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
