import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/mocks/hotelData";
import type { FolioLinha, FolioTotais } from "../types/folio";

const TIPO_LABEL: Record<FolioLinha["tipo"], string> = {
  diaria: "Diária",
  consumo: "Consumo",
  pagamento: "Pagamento",
};

export function FolioStatement({
  linhas,
  totais,
  onRemoveConsumo,
}: {
  linhas: FolioLinha[];
  totais: FolioTotais;
  onRemoveConsumo?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Lançamento</th>
              <th className="px-3 py-2 font-medium">Qtd</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              {onRemoveConsumo ? <th className="px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td
                  colSpan={onRemoveConsumo ? 4 : 3}
                  className="px-3 py-4 text-muted-foreground"
                >
                  Nenhum lançamento na conta.
                </td>
              </tr>
            ) : (
              linhas.map((linha) => (
                <tr key={linha.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                      {TIPO_LABEL[linha.tipo]}
                    </span>
                    {linha.descricao}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{linha.quantidade}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {linha.tipo === "pagamento" ? "− " : ""}
                    {formatCurrency(Math.abs(linha.total))}
                  </td>
                  {onRemoveConsumo ? (
                    <td className="px-2 py-2 text-right">
                      {linha.removivel ? (
                        <button
                          type="button"
                          aria-label={`Remover ${linha.descricao}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={() => onRemoveConsumo(linha.id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Diárias</dt>
        <dd className="text-right tabular-nums">{formatCurrency(totais.totalDiarias)}</dd>
        <dt className="text-muted-foreground">Consumo</dt>
        <dd className="text-right tabular-nums">{formatCurrency(totais.totalConsumo)}</dd>
        <dt className="text-muted-foreground">Pagamentos</dt>
        <dd className="text-right tabular-nums">− {formatCurrency(totais.totalPagamentos)}</dd>
      </dl>

      <div className="rounded-xl bg-secondary px-4 py-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Saldo da conta
        </p>
        <p className="font-display mt-1 text-3xl font-medium tracking-tight tabular-nums">
          {formatCurrency(totais.saldo)}
        </p>
      </div>
    </div>
  );
}
