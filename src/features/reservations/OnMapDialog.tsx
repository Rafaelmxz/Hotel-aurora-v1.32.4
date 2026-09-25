/**
 * Pop-up em cima do mapa. Mapa e menu ficam visíveis atrás.
 * Proibido: Portal, overlay fixed, absolute+relative no mesmo nó.
 * Não grava nada.
 */
import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function OnMapDialog({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root modal={false} open={open} onOpenChange={onOpenChange}>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar fundo"
            className="absolute inset-0 z-40 cursor-default bg-transparent"
            onClick={() => onOpenChange(false)}
          />
          <DialogPrimitive.Content
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
            style={{ transform: "translateX(-50%)" }}
            className={cn(
              "absolute top-10 left-1/2 z-50 w-[min(32rem,calc(100%-2rem))] max-h-[min(36rem,calc(100dvh-6rem))] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-border)]",
              className,
            )}
          >
            {children}
          </DialogPrimitive.Content>
        </>
      ) : null}
    </DialogPrimitive.Root>
  );
}
