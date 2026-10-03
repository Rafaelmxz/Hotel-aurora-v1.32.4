# Hotel Aurora PMS — descrição do sistema (v1.32.51)

Documento de produto, arquitetura e lógica. Complementa [ARQUITETURA.md](./ARQUITETURA.md) (pastas), [FASE-0.md](./FASE-0.md) (combinado), [INDICE.md](./INDICE.md) (feito/falta) e [MAPA-ARQUITETURA.md](./MAPA-ARQUITETURA.md) (onde editar).

## 1. O que é

Sistema de **gestão hoteleira (PMS)** + **motor de reservas** do Hotel Aurora.

A recepção opera o hotel (mapa, ficha, casa, limpeza, caixa, tarifas, equipe). O hóspede reserva no motor público, sem login. Não há Booking.com / Airbnb nesta versão (Channel Manager fica de fora).

Modelo: um hotel, uma fonte de preço (grelha), uma fonte de vaga, uma fonte de reserva. Não é clone de marca.

Versão atual: **1.32.51**. PIN de elevação para Gerente/Admin é definido na Equipe; o modal abre sempre vazio. Idle de 15 min derruba admin/gerente para recepção. Cookie de login não expira por esse idle. Diário operacional (`audit` no cofre) registra criar/confirmar/check-in/checkout, cargo, PIN, elevação e fechar caixa — sem tela ainda, sem prova contra DevTools.

## 2. Teste de ouro (não quebrar)

1. No motor, o hóspede pede reserva **pagando no check-in**.
2. Aparece para a recepção como **pendente**.
3. A recepção **confirma**.
4. A estadia **cai no mapa**.
5. **Check-in** (só quarto limpo, com FNRH: documento + nascimento).
6. **Check-out** com conta zerada.
7. O quarto fica **sujo**.

Pix com QR no site **confirma sozinho** e lança o sinal — isso **não substitui** o teste de ouro.

## 3. Arquitetura

Telas React pedem dados via TanStack Query. Cada domínio tem um **store**. Depois de cada mudança o **cofre** grava o hotel (navegador + documento no banco da propriedade). O motor público grava pedido sem PIN da equipe. Regras de ocupação, check-in e check-out recusam snapshot inválido.

```
Hóspede (/reservar) ──quoteStay segmento site──► pedido + cofre
Recepção (login) ──hidrata cofre──► stores ──► mapa, casa, folio, tarifas
Regras (preço, vaga, status) nascem no store / rules.ts, não na view
```

### Camadas

| Camada | Papel |
|---|---|
| Rotas (`src/routes`) | Uma tela por caminho |
| Features | Views + hooks |
| Stores | Reservas, bloqueio, venda fechada, quartos, tipos, folio, tarifas, equipe |
| Cofre (`src/lib/hotel`) | Snapshot JSON, merge, ingestão do site |
| Auth | Better Auth; `/reservar` continua público |
| Banco | `hotel_vault` + pendências públicas + e-mails do voucher |

Persistência da equipe: `localStorage` (`aurora-hotel-vault-v1`) + tabela `hotel_vault`. Pedido do site: `hotel_public_pending` + merge. IDs do site: `res-` + UUID.

## 4. Lógica da hospedagem

### Estados

`pendente` → `confirmada` → `check-in` → `check-out` (ou `cancelada`).

Noite ocupada: check-in **inclusive**, check-out **exclusive**. Cancelada **não entra no mapa**.

### Vaga (uma regra)

Ocupa a noite se houver, no mesmo quarto ou no tipo:

- reserva ativa (não cancelada)
- **bloqueio** (não é reserva: sem hóspede, folio, Pix ou check-in)
- **venda fechada** (fecha o tipo na data, sem mudar preço)

Site e mapa usam a mesma conta. Bloqueio e venda fechada não entram na tabela de pré-reservas.

### Preço (uma grelha)

`quoteStay` em `pricing.ts`:

1. Grelha da categoria: 1–4 adultos + 1–2 crianças, dia de semana ou fim de semana.
2. Extra acima de 4 adultos (`+ADL`) ou 2 crianças (`+CHD`).
3. Temporada (percentual ou valor fixo).
4. Oferta mais forte (Pix da vitrine pode disparar oferta).
5. Cupom, se houver.

**Balcão** usa a grelha crua. **Site** aplica desconto ou acréscimo (%) por categoria (`sitePercent`). Reserva já criada **não é reprecificada** se a tarifa mudar. Reserva do motor grava o preço do site, não o do balcão.

Capacidade: o site não oferece quarto que não cabe. No balcão, excesso mostra aviso vermelho e a recepção ainda pode confirmar, cobrando o extra.

### Pedido no site

- **Pagar no check-in** → `pendente`.
- **Pix** → `confirmada`, sinal no folio, já ocupa.
- A vitrine mostra quantos quartos estão livres e o preço da grelha do site.
- Adultos no motor: mínimo `01`, sobe de um em um.

### Folio

Diárias + consumos − pagamentos = saldo. Mesma conta na ficha, no voucher e no caixa. Experiências do motor entram como consumo (preço do catálogo).

### Check-in / FNRH / check-out

- Check-in bloqueado se quarto **sujo** ou **manutenção**.
- FNRH na ficha: documento e nascimento obrigatórios; nacionalidade, profissão, procedência e próximo destino opcionais. Grava na reserva.
- Check-out só com **saldo zero**; o quarto fica **sujo**.

### Casa

Mapa de casinhas do dia: livre, ocupado, pré-reserva, indisponível. Seta antes = entra hoje; seta depois = sai hoje. Recado curto na casinha. Limpeza da camareira continua na tela de limpeza.

## 5. Telas

| Tela | O que faz |
|---|---|
| Início | Chegadas, saídas, ocupação, aviso de pedidos |
| Mapa | Timeline, pré-reservas, pop-up de nova reserva / bloqueio / fechar venda, arraste |
| Casa | Situação do dia (cores, setas, recado) |
| Motor de reservas | Config da vitrine (equipe) e `/reservar` (hóspede) |
| Tarifas | Grelha, temporada, calendário pintado, fechar dia, segmento site |
| Hotel | Propriedade, bloqueio, fechar venda, Pix, e-mails |
| Limpeza | Limpo / sujo / em limpeza / manutenção |
| Caixa, hóspedes, relatórios, equipe | Como nas versões anteriores |

## 6. O que não entra nesta versão

- Channel Manager (Booking, Airbnb)
- Relatório fiscal / NFC-e
- WhatsApp
- PDF oficial da FNRH
- Tarifário pintado dia a dia (a grelha é por período, não por célula de calendário)
- Clonar marca de outro PMS

## 7. Linha recente

| Versão | Recorte |
|---|---|
| 1.32.41 | Criança no 2+1 não some a vaga do motor |
| 1.32.42 | “N quartos livres” |
| 1.32.43–44 | Adultos no motor com `01`, sem pular para 6 |
| 1.32.45–46 | Segmento site (desconto/acréscimo); pagamento grava o preço do site |
| 1.32.47 | FNRH no check-in |
| 1.32.48 | PIN sem semente 1234 |
| 1.32.49 | Idle 15 min derruba sessão elevada |
| 1.32.50 | Modal de PIN sempre vazio; idle 15 min em produção |
| 1.32.51 | Diário operacional no cofre (hospedagem + equipe + caixa; sem tela) |

Fases A (preço), B (mapa e casa) e C (site e recepção) do cronograma estão fechadas.
