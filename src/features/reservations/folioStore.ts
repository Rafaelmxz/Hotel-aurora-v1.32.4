import { listReservations } from "./reservationStore";
import { stayNights, TODAY_ISO } from "@/mocks/hotelData";
import type {
  ConsumoItem,
  FolioLinha,
  FolioResumo,
  FolioTotais,
  PagamentoItem,
} from "./types/folio";
import { METODO_PAGAMENTO_LABEL } from "./types/folio";

export const folioKeys = {
  all: ["folio"] as const,
  byReservation: (reservaId: string) => ["folio", reservaId] as const,
};

function formatHora(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const CONSUMOS_SEED: ConsumoItem[] = [
  {
    id: "csm-001",
    reserva_id: "res-001",
    descricao: "Frigobar — água",
    valor: 12,
    quantidade: 2,
    data_lancamento: "2026-09-07",
  },
  {
    id: "csm-002",
    reserva_id: "res-001",
    descricao: "Café da manhã extra",
    valor: 45,
    quantidade: 1,
    data_lancamento: "2026-09-08",
  },
  {
    id: "csm-003",
    reserva_id: "res-002",
    descricao: "Lavanderia",
    valor: 38,
    quantidade: 1,
    data_lancamento: "2026-09-06",
  },
  {
    id: "csm-004",
    reserva_id: "res-002",
    descricao: "Room service — jantar",
    valor: 89,
    quantidade: 1,
    data_lancamento: "2026-09-07",
  },
  {
    id: "csm-005",
    reserva_id: "res-003",
    descricao: "Estacionamento",
    valor: 25,
    quantidade: 2,
    data_lancamento: "2026-09-08",
  },
];

const PAGAMENTOS_SEED: PagamentoItem[] = [
  {
    id: "pag-001",
    reserva_id: "res-001",
    descricao: "Sinal na reserva",
    valor: 200,
    data_pagamento: "2026-09-01",
    metodo: "pix",
  },
  {
    id: "pag-002",
    reserva_id: "res-002",
    descricao: "Pagamento parcial",
    valor: 350,
    data_pagamento: "2026-09-05",
    metodo: "cartao_credito",
  },
];

let consumos: ConsumoItem[] = CONSUMOS_SEED.map((row) => ({ ...row }));
let pagamentos: PagamentoItem[] = PAGAMENTOS_SEED.map((row) => ({ ...row }));
let consumoSeq = consumos.length + 1;
let pagamentoSeq = pagamentos.length + 1;

function seedTodayPayments() {
  const reservations = listReservations();
  if (reservations.length === 0) return;
  const templates: Array<{ metodo: PagamentoItem["metodo"]; valor: number; hora: string }> = [
    { metodo: "pix", valor: 420, hora: "09:14" },
    { metodo: "cartao_credito", valor: 890, hora: "10:36" },
    { metodo: "dinheiro", valor: 180, hora: "11:05" },
    { metodo: "cartao_debito", valor: 310, hora: "13:22" },
    { metodo: "pix", valor: 150, hora: "15:48" },
    { metodo: "dinheiro", valor: 95, hora: "16:10" },
    { metodo: "cartao_credito", valor: 640, hora: "17:41" },
  ];
  const extras = templates.map((row, index) => {
    const reservation = reservations[index % reservations.length]!;
    return {
      id: `pag-today-${String(index + 1).padStart(3, "0")}`,
      reserva_id: reservation.id,
      descricao: "Pagamento na recepção",
      valor: row.valor,
      data_pagamento: TODAY_ISO,
      hora: row.hora,
      metodo: row.metodo,
    } satisfies PagamentoItem;
  });
  pagamentos = [...pagamentos, ...extras];
  pagamentoSeq = pagamentos.length + 1;
}

seedTodayPayments();

export function listConsumos(reservaId: string): ConsumoItem[] {
  return consumos
    .filter((item) => item.reserva_id === reservaId)
    .map((item) => ({ ...item }));
}

export function listPagamentos(reservaId: string): PagamentoItem[] {
  return pagamentos
    .filter((item) => item.reserva_id === reservaId)
    .map((item) => ({ ...item }));
}

export function listAllPagamentos(): PagamentoItem[] {
  return pagamentos.map((item) => ({ ...item }));
}

export function listAllConsumos(): ConsumoItem[] {
  return consumos.map((item) => ({ ...item }));
}

export function replaceFolio(next: { consumos: ConsumoItem[]; pagamentos: PagamentoItem[] }) {
  consumos = next.consumos.map((item) => ({ ...item }));
  pagamentos = next.pagamentos.map((item) => ({ ...item }));
  consumoSeq = consumos.length + 1;
  pagamentoSeq = pagamentos.length + 1;
}

export function totalConsumo(itens: ConsumoItem[]): number {
  return itens.reduce((sum, item) => sum + item.valor * item.quantidade, 0);
}

export function totalPagamentos(itens: PagamentoItem[]): number {
  return itens.reduce((sum, item) => sum + item.valor, 0);
}

export function calcularTotais(
  totalDiarias: number,
  itens: ConsumoItem[],
  pagamentosReserva: PagamentoItem[],
): FolioTotais {
  const consumo = totalConsumo(itens);
  const pagos = totalPagamentos(pagamentosReserva);
  return {
    totalDiarias,
    totalConsumo: consumo,
    totalPagamentos: pagos,
    saldo: totalDiarias + consumo - pagos,
  };
}

export function buildFolioLinhas(
  reservaId: string,
  totalDiarias: number,
  nightlyRate: number,
  checkIn: string,
  checkOut: string,
  itens: ConsumoItem[],
  pagamentosReserva: PagamentoItem[],
): FolioLinha[] {
  const nights = stayNights(checkIn, checkOut);
  const linhas: FolioLinha[] = [
    {
      id: `diaria-${reservaId}`,
      tipo: "diaria",
      descricao: `Diárias · ${nights} ${nights === 1 ? "noite" : "noites"}`,
      quantidade: nights,
      valor: nightlyRate,
      total: totalDiarias,
      data: checkIn,
    },
  ];
  for (const item of itens) {
    linhas.push({
      id: item.id,
      tipo: "consumo",
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor: item.valor,
      total: item.valor * item.quantidade,
      data: item.data_lancamento,
      removivel: true,
    });
  }
  for (const item of pagamentosReserva) {
    const metodo = METODO_PAGAMENTO_LABEL[item.metodo];
    linhas.push({
      id: item.id,
      tipo: "pagamento",
      descricao: item.observacao ? `${item.descricao} · ${metodo} · ${item.observacao}` : `${item.descricao} · ${metodo}`,
      quantidade: 1,
      valor: item.valor,
      total: -item.valor,
      data: item.data_pagamento,
    });
  }
  return linhas;
}

export function getFolio(reservaId: string): FolioResumo {
  const reservation = listReservations().find((row) => row.id === reservaId);
  const itens = listConsumos(reservaId);
  const pagamentosReserva = listPagamentos(reservaId);
  const totalDiarias = reservation?.totalAmount ?? 0;
  return {
    reservaId,
    itens,
    pagamentos: pagamentosReserva,
    linhas: reservation
      ? buildFolioLinhas(
          reservaId,
          totalDiarias,
          reservation.nightlyRate,
          reservation.checkIn,
          reservation.checkOut,
          itens,
          pagamentosReserva,
        )
      : [],
    totais: calcularTotais(totalDiarias, itens, pagamentosReserva),
  };
}

export function addConsumo(input: {
  reserva_id: string;
  descricao: string;
  valor: number;
  quantidade: number;
  id?: string;
}): ConsumoItem {
  const item: ConsumoItem = {
    id: input.id ?? `csm-${String(consumoSeq++).padStart(3, "0")}`,
    reserva_id: input.reserva_id,
    descricao: input.descricao.trim(),
    valor: input.valor,
    quantidade: input.quantidade,
    data_lancamento: new Date().toISOString().slice(0, 10),
  };
  consumos = [...consumos, item];
  return { ...item };
}

export function removeConsumo(id: string): void {
  consumos = consumos.filter((item) => item.id !== id);
}

export function removePagamento(id: string): void {
  pagamentos = pagamentos.filter((item) => item.id !== id);
}

export function addPagamento(input: {
  reserva_id: string;
  valor: number;
  metodo: PagamentoItem["metodo"];
  observacao?: string;
  descricao?: string;
  id?: string;
}): PagamentoItem {
  const item: PagamentoItem = {
    id: input.id ?? `pag-${String(pagamentoSeq++).padStart(3, "0")}`,
    reserva_id: input.reserva_id,
    descricao: input.descricao?.trim() || "Pagamento na recepção",
    valor: input.valor,
    data_pagamento: new Date().toISOString().slice(0, 10),
    hora: formatHora(new Date()),
    metodo: input.metodo,
    observacao: input.observacao?.trim() || undefined,
  };
  pagamentos = [...pagamentos, item];
  return { ...item };
}
