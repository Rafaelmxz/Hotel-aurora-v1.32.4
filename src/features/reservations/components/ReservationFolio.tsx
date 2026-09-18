import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFolio } from "../hooks/useFolio";
import { FolioStatement } from "./FolioStatement";

export function ReservationFolio({
  reservationId,
  onRegisterPayment,
}: {
  reservationId: string;
  onRegisterPayment?: () => void;
}) {
  const folio = useFolio(reservationId);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedValor = Number(valor.replace(",", "."));
    const parsedQtd = Number(quantidade);
    if (!descricao.trim() || !Number.isFinite(parsedValor) || parsedValor <= 0) return;
    if (!Number.isFinite(parsedQtd) || parsedQtd <= 0) return;
    try {
      await folio.addItem.mutateAsync({
        descricao: descricao.trim(),
        valor: parsedValor,
        quantidade: parsedQtd,
      });
      setDescricao("");
      setValor("");
      setQuantidade("1");
      toast.success("Consumo lançado");
    } catch {
      toast.error("Não foi possível lançar o consumo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/50 p-3"
      >
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Novo consumo
        </p>
        <div className="grid gap-2">
          <Label htmlFor="folio-descricao">Descrição</Label>
          <Input
            id="folio-descricao"
            required
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Ex.: Frigobar, café extra"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="folio-valor">Valor (R$)</Label>
            <Input
              id="folio-valor"
              required
              inputMode="decimal"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="folio-qtd">Quantidade</Label>
            <Input
              id="folio-qtd"
              required
              inputMode="numeric"
              value={quantidade}
              onChange={(event) => setQuantidade(event.target.value)}
            />
          </div>
        </div>
        <Button type="submit" disabled={folio.addItem.isPending}>
          Lançar item
        </Button>
      </form>

      <FolioStatement
        linhas={folio.linhas}
        totais={folio.totais}
        onRemoveConsumo={(id) => folio.removeItem.mutate(id)}
      />

      {onRegisterPayment ? (
        <Button type="button" className="w-full" onClick={onRegisterPayment}>
          Registrar pagamento
        </Button>
      ) : null}
    </div>
  );
}
