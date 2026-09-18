# Hotel Aurora PMS — descrição do sistema (v1.32.4)

Documento de produto e lógica. Complementa [ARQUITETURA.md](./ARQUITETURA.md) (pastas e fluxo técnico) e [FASE-0.md](./FASE-0.md) (combinado de recortes).

## 1. O que é

Sistema de **gestão hoteleira (PMS)** + **site de reservas** do Hotel Aurora.

A recepção opera o hotel (mapa, ficha, limpeza, caixa, tarifas, equipe). O hóspede reserva no site público, sem login. Não há Booking.com / Airbnb nesta versão (Channel Manager fica de fora).

Modelo de produto: um hotel, uma fonte de preço, vaga e reserva. Estilo PMS + motor de reservas próprio (não clone de marca).

Versão atual: **1.32.4**. PIN de elevação demo: **1234**.

## 2. Teste de ouro (não quebrar)

1. No site, o hóspede pede reserva **pagando no check-in**.
2. Aparece para a recepção como **pendente**.
3. A recepção **confirma**.
4. A estadia **cai no mapa**.
5. **Check-in** (só quarto limpo).
6. **Check-out** com conta zerada.
7. O quarto fica **sujo**.

Pix com QR no site **confirma sozinho** e lança o sinal — isso **não substitui** o teste de ouro.

## 3. Arquitetura em uma frase

Telas React pedem dados via TanStack Query; cada domínio tem um **store**; depois de cada mudança o **cofre** grava o hotel (navegador + documento no banco da propriedade). O site público grava pedido pendente sem PIN da equipe. Regras de ocupação, check-in e check-out recusam snapshot inválido.

```
Hóspede (/reservar) ──pedido──► pendências públicas + cofre
                                      │
Recepção (login) ──hidrata cofre──► stores ──► mapa, folio, limpeza, caixa
                                      │
                              push protegido (não apaga pedido do site)
```

### Camadas

| Camada | Papel |
|---|---|
| Rotas (`src/routes`) | Uma tela por caminho |
| Features | Views + hooks da recepção e da vitrine |
| Stores | Reservas, quartos, folio, tarifas, equipe, vitrine |
| Cofre (`src/lib/hotel`) | Snapshot JSON versionado, merge, ingestão do site |
| Auth | Better Auth: conta da equipe; `/reservar` continua público |
| Banco | Documento `hotel_vault` + pendências públicas + e-mails do voucher |

Persistência dupla da equipe: `localStorage` (`aurora-hotel-vault-v1`) + tabela `hotel_vault`. Pedido do site: `hotel_public_pending` + merge no cofre. IDs de reserva do site são únicos (`res-` + UUID) para não colidir com a sequência da recepção.

## 4. Lógica da hospedagem

### Estados

`pendente` → `confirmada` → `check-in` → `check-out` (ou `cancelada`).

Noite ocupada: check-in **inclusive**, check-out **exclusive**. Cancelada **não entra no mapa**. Duas estadias no mesmo quarto em noites que se tocam empilham em faixas (lanes), não atravessam.

### Anti-overbooking

Conflito se `checkInNovo < checkOutExistente` e `checkOutNovo > checkInExistente` no mesmo quarto, ignorando canceladas. Vale na tela e no cofre.

### Preço

`quoteStay`: tarifa (pax + refeição + weekday/weekend) → temporada → oferta mais forte → cupom. No Pix da vitrine o preço é recalculado no servidor. Experiências (café, traslado, cama extra) entram como **consumo** no folio, com quantidade e preço do catálogo (o cliente não escolhe o valor).

### Pedido no site

- **Pagar no check-in** → `pendente`. A recepção confirma; não lança sinal sozinho.
- **Pix (QR / copia-e-cola)** → `confirmada`, sinal no folio, já ocupa.

O pedido aparece no **mapa** (aviso + tabela) e no **Início** (aviso). Clique na linha da tabela: a semana anda até o check-in, a barra destaca, a ficha abre.

### Folio único

Diárias + consumos − pagamentos = saldo. Mesma conta na ficha, no voucher e no caixa.

### Check-in / check-out

- Check-in bloqueado se quarto **sujo** ou **manutenção**.
- Check-out só com **saldo zero**; o quarto fica **sujo**.

### Voucher

Comprovante na tela (imprimir) e e-mail para o hóspede. Cópia em Hotel → e-mails enviados.

## 5. Experiências (vitrine)

Na busca do site, depois dos quartos, cards com foto, “como funciona” e preço. O hóspede inclui na reserva. No pagamento só o resumo. Extra escolhido persiste se a busca de datas mudar; “Nova reserva” zera.

Catálogo atual: café da manhã (por hóspede), traslado (por estadia), cama extra (por noite). Preço e quantidade são recalculados no servidor.

## 6. Telas da recepção

| Tela | O que faz |
|---|---|
| Início | Rotina do dia, KPIs, aviso de pedidos do site |
| Mapa | Timeline 21 dias, tabela de pré-reservas, ficha (confirmar, check-in, conta, voucher) |
| Reservas | Filtros, histórico, CSV |
| Ocupação | Matriz 14 dias por categoria |
| Hóspedes | Ficha e histórico |
| Limpeza | Limpo / sujo / em limpeza / manutenção |
| Caixa | Movimento do dia e turno |
| Tarifas | Diária, ofertas, pacotes, cupons |
| Relatórios | Ocupação, ADR, RevPAR, DRE |
| Site | Config da vitrine (preços das experiências, Pix, textos) |
| Hotel | Propriedade, Pix, e-mails enviados |
| Equipe | Contas, cargos, PIN |

### Arraste do mapa

O mapa puxa para o lado (inclusive pelas barras). Clique curto abre a ficha; arraste não abre. A tabela de pedidos **não** é a faixa antiga de cartões (essa travava).

## 7. Contas e cargos

Login: Google, X ou e-mail. Primeiro acesso vira administrador. Mesmo e-mail da Equipe assume o cargo, sem PIN. Troca para Gerente/Admin de outro perfil pede PIN **1234**.

Cargos: Admin (tudo), Gerente (sem Equipe), Recepcionista (mapa, reservas, hóspedes, caixa, site), Governança (limpeza), Financeiro (início, caixa, relatórios).

## 8. O que não entra nesta versão

- Channel Manager (Booking, Airbnb)
- Relatório fiscal / NFC-e
- WhatsApp / marketing
- Inteligência de preço
- Clonar marca de outro PMS

## 9. Linha de versões desta conversa

| Versão | Recorte |
|---|---|
| 1.31.0 | Pix QR na vitrine |
| 1.31.1 | Pedido do site aparece no mapa / pré-reservas |
| 1.31.2 | Barras do mapa sem atravessar |
| 1.32.0 | Adicionais no site (consumo no folio) |
| 1.32.1 | Experiências em cards na vitrine |
| 1.32.2 | Clique na pré-reserva foca a barra |
| 1.32.3 | Aviso no lugar da faixa (arraste solto) |
| 1.32.4 | Tabela simples de pré-reservas só no mapa |

## 10. Como continuar sem misturar

Um recorte por vez. Não misturar visual, banco e pastas no mesmo passo. Rodar o teste de ouro no fim. Extra vai para a lista “depois” em FASE-0.
