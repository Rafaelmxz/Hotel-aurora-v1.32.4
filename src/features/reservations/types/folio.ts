export type ConsumoItem = {
  id: string;
  reserva_id: string;
  descricao: string;
  valor: number;
  quantidade: number;
  data_lancamento: string;
};

export type MetodoPagamento =
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "dinheiro";

export type PagamentoItem = {
  id: string;
  reserva_id: string;
  descricao: string;
  valor: number;
  data_pagamento: string;
  hora?: string;
  metodo: MetodoPagamento;
  observacao?: string;
};

export type FolioLinhaTipo = "diaria" | "consumo" | "pagamento";

export type FolioLinha = {
  id: string;
  tipo: FolioLinhaTipo;
  descricao: string;
  quantidade: number;
  valor: number;
  total: number;
  data: string;
  removivel?: boolean;
};

export type FolioTotais = {
  totalDiarias: number;
  totalConsumo: number;
  totalPagamentos: number;
  saldo: number;
};

export type FolioResumo = {
  reservaId: string;
  itens: ConsumoItem[];
  pagamentos: PagamentoItem[];
  linhas: FolioLinha[];
  totais: FolioTotais;
};

export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamento, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

export function notesSayPayAtCheckIn(notes?: string) {
  return Boolean(notes?.includes("Pagamento no check-in"));
}
