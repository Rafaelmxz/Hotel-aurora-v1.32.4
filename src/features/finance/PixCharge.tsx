import { useMemo, useState } from "react";
import { renderSVG } from "uqr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/mocks/hotelData";
import { buildPixPayload, pixCityFromAddress, pixTxid } from "@/lib/pix/brcode";

export function PixCharge({
  amount,
  pixKey,
  payee,
  address,
  seed,
  description,
}: {
  amount: number;
  pixKey: string;
  payee: string;
  address: string;
  seed: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);
  const txid = useMemo(() => pixTxid(seed), [seed]);
  const payload = useMemo(() => {
    try {
      return buildPixPayload({
        key: pixKey,
        name: payee,
        city: pixCityFromAddress(address),
        amount,
        txid,
        description,
      });
    } catch {
      return "";
    }
  }, [pixKey, payee, address, amount, txid, description]);

  const svg = useMemo(
    () =>
      payload
        ? renderSVG(payload, {
            border: 2,
            pixelSize: 4,
            blackColor: "currentColor",
            whiteColor: "transparent",
          })
        : "",
    [payload],
  );

  async function copy() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie.");
    }
  }

  if (!pixKey.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        O hotel ainda não cadastrou a chave Pix em Hotel.
      </p>
    );
  }

  if (!payload) {
    return <p className="text-sm text-muted-foreground">Não foi possível montar o Pix.</p>;
  }

  return (
    <div className="grid gap-3 rounded-lg bg-secondary p-4">
      <p className="text-sm font-medium">Pix · {formatCurrency(amount)}</p>
      <p className="text-xs text-muted-foreground">
        {payee} · chave {pixKey}
      </p>
      <div
        className="mx-auto w-48 text-foreground"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-center text-xs text-muted-foreground">Abra o app do banco e leia o QR</p>
      <textarea
        readOnly
        value={payload}
        className="min-h-16 w-full resize-none rounded-md border border-input bg-card px-3 py-2 font-mono text-[11px] leading-snug"
        aria-label="Pix copia e cola"
      />
      <Button type="button" variant="outline" onClick={() => void copy()}>
        {copied ? "Código copiado" : "Copiar Pix (copia e cola)"}
      </Button>
      <p className="text-[11px] text-muted-foreground">Identificador {txid}</p>
    </div>
  );
}

export function pixNote(txidSeed: string, percent: number) {
  return `Sinal Pix ${percent}% · txid ${pixTxid(txidSeed)}`;
}
