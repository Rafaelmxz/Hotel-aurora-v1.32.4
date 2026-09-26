import { TODAY_ISO } from "@/mocks/hotelData";
import { listAllPagamentos } from "@/features/reservations/folioStore";
import type { MetodoPagamento } from "@/features/reservations/types/folio";

export const cashKeys = {
  all: ["cash"] as const,
  day: (date: string) => ["cash", date] as const,
};

export type CashTotals = Record<MetodoPagamento, number> & { total: number };

export type CashClose = {
  id: string;
  date: string;
  status: "aberto" | "fechado";
  countedCash: number;
  systemCash: number;
  difference: number;
  totals: CashTotals;
  notes?: string;
  closedAt?: string;
};

let closes: CashClose[] = [];

export function totalsForDate(date: string): CashTotals {
  const dayItems = listAllPagamentos().filter((item) => item.data_pagamento === date);
  const totals: CashTotals = {
    pix: 0,
    cartao_credito: 0,
    cartao_debito: 0,
    dinheiro: 0,
    total: 0,
  };
  for (const item of dayItems) {
    totals[item.metodo] += item.valor;
    totals.total += item.valor;
  }
  return totals;
}

export function getCashClose(date: string = TODAY_ISO): CashClose | undefined {
  return closes.find((row) => row.date === date);
}

export function listCashCloses(): CashClose[] {
  return closes.map((row) => ({ ...row, totals: { ...row.totals } }));
}

export function replaceCashCloses(rows: CashClose[]) {
  closes = rows.map((row) => ({ ...row, totals: { ...row.totals } }));
}

export function closeCash(input: {
  date?: string;
  countedCash: number;
  notes?: string;
}): CashClose {
  const date = input.date ?? TODAY_ISO;
  const totals = totalsForDate(date);
  const systemCash = totals.dinheiro;
  const report: CashClose = {
    id: `caixa-${date}`,
    date,
    status: "fechado",
    countedCash: input.countedCash,
    systemCash,
    difference: input.countedCash - systemCash,
    totals,
    notes: input.notes?.trim() || undefined,
    closedAt: new Date().toISOString(),
  };
  closes = [...closes.filter((row) => row.date !== date), report];
  return { ...report };
}
