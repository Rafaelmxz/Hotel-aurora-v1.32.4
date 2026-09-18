import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listVoucherEmailsFn } from "@/lib/hotel/api";
import { Button } from "@/components/ui/button";

export function EmailOutbox() {
  const { data = [], isLoading, refetch, isFetching, isError } = useQuery({
    queryKey: ["hotel-email-outbox"],
    queryFn: () => listVoucherEmailsFn(),
    staleTime: 10_000,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data.find((row) => row.id === openId);

  return (
    <section className="grid gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">E-mails enviados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cópia de cada voucher. Se o envio externo não estiver ligado, o recado
            fica só nesta caixa do hotel.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
          Atualizar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando caixa…</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Não foi possível abrir a caixa de e-mails.</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum voucher enviado ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((row) => (
            <li key={row.id} className="py-3">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenId(row.id === openId ? null : row.id)}
              >
                <p className="font-medium">{row.subject}</p>
                <p className="text-sm text-muted-foreground">
                  Para {row.to_email}
                  {row.delivered ? " · entregue" : " · na caixa do hotel"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <iframe
          title={open.subject}
          srcDoc={open.html}
          className="h-[28rem] w-full rounded-lg border border-border bg-background"
        />
      ) : null}
    </section>
  );
}
