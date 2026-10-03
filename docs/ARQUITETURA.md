# Arquitetura lógica — Hotel Aurora PMS v1.32.4

## 1. Resumo

PMS de demonstração (SPA React) cobrindo o ciclo da hospedagem: vitrine pública → pré-reserva ou confirmação com Pix → mapa → check-in → folio único → voucher → check-out → governança.

Não há servidor de regras de negócio. Cada domínio tem um **store em memória**. Depois de cada mudança o **cofre** grava o hotel (navegador + banco da propriedade). O **TanStack Query** replica o cache; mutações usam `setQueryData` / `invalidateQueries` para o mapa, o dashboard e o checkout mudarem na hora.

```
┌─────────────────────────────────────────────────────────┐
│ AppShell  marca · menu RBAC · conta + PIN · versão      │
│ rotas TanStack Router                                   │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │ features/* (telas)  │
              │ hooks + Query       │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │ stores de domínio   │
              │ + mocks/hotelData   │
              └─────────────────────┘
```

## 2. Pastas

```
src/
  routes/                      uma rota por tela
  features/
    dashboard/                 Início (rotina do dia)
    reservations/              mapa, ficha, busca, ocupação 14 dias
    direct-booking/            site /reservar + config da vitrine
    rates/                     tarifas, cupons, pacotes, ofertas
    rooms/                     quartos + limpeza
    finance/                   caixa
    guests/                    hóspedes
    reports/                   KPIs e DRE
    settings/                  hotel
    users/                     equipe, RBAC, PIN
    audit/                     diário operacional no cofre
  mocks/hotelData.ts
  lib/version.ts               v1.32.4
```

Padrão: **tipos → store → hooks (Query) → views**.

## 3. Modelo

| Entidade | Campos-chave |
|---|---|
| Propriedade | nome, logo, Pix, horários, % sinal, overbooking |
| Quarto | número, tipo, capacidade, governança |
| Reserva | hóspede, quarto, `[checkIn, checkOut)`, status, origem, createdAt |
| Folio | diárias + consumos − pagamentos = saldo |
| Tarifa | 1/2 pax × café/pensão × weekday/weekend |
| Oferta | % ou R$, validade, Pix, dias da semana, mín. noites, ativa/inativa |
| Pacote / cupom | datas + mínimo; código + limite de uso |
| Usuário | cargo, PIN (Admin/Gerente) |

Status: `pendente → confirmada → check-in → check-out` (ou `cancelada`). No-show na listagem: confirmada com check-in passado sem entrada real.

Noite ocupada: check-in inclusive, check-out exclusive.

## 4. Regras

**Anti-overbooking.** Conflito se `checkInNovo < checkOutExistente AND checkOutNovo > checkInExistente`.

**Preço (`quoteStay`).** Tarifa (pax + refeição + weekday/weekend) → temporada → **oferta mais forte** (%, R$, Pix, dia da semana, mín. noites) → cupom. No checkout público, `pix: true` recalcula na hora.

**Pré-reserva.** Vitrine → quarto vago da categoria. **Pagar no check-in** entra `pendente`; a recepção confirma (sem lançar sinal). **Pix (QR / copia-e-cola)** confirma sozinho, lança o sinal no folio e já ocupa como `confirmada`.

**Folio único.** Um extrato: diárias + consumos − pagamentos = saldo. Mesma conta na recepção, na ficha do hóspede e no voucher.

**Voucher.** Comprovante na tela (imprimir) e e-mail para o hóspede. Cópia na caixa do hotel (`Hotel → E-mails enviados`). Sem SMTP configurado, a cópia fica só no hotel.

**Check-in / check-out.** Check-in bloqueado se quarto sujo/manutenção. Check-out exige saldo zero e marca o quarto sujo.

**RBAC.** Admin (tudo), Gerente (sem Equipe), Recepcionista (mapa, reservas, hóspedes, caixa, site), Governança (limpeza), Financeiro (início, caixa, DRE).

**PIN.** Elevação para Gerente/Admin. PIN nasce vazio; a Equipe grava 4 dígitos. O modal de elevação abre sempre vazio (sem autofill). Conta real (Google, X ou e-mail) assume o cargo do mesmo e-mail quando ele não exige PIN. 15 min sem clique/tecla/navegação derruba admin/gerente para recepção; F5 não reelevar sozinho. Cookie de login permanece.

**Diário.** Array `audit` no cofre: quem da sessão criou/confirmou/fez check-in/checkout, mudou cargo ou PIN, elevou no seletor ou fechou o caixa. Pedido do site entra como Link público. Quem edita o DevTools edita o diário. Sem tela nesta versão.

**Cofre.** A tela avisa; o documento do hotel recusa. Overbooking, check-in em quarto sujo/manutenção e check-out com saldo não entram no snapshot. Check-out grava o quarto sujo na mesma alteração. Pedido do site que invade uma reserva da recepção é descartado.

## 5. Fluxo de dados

```
UI --mutate--> hook --fn--> store --persistVault--> cofre (equipe autenticada)
                    │
                    v
         setQueryData / invalidateQueries
                    │
                    v
   mapa · dashboard · ocupação · busca · checkout
```

F5: depois da hidratação o cofre aplica o último snapshot local e, se precisar, o documento do servidor. `/reservar` lê ocupação pública e grava pré-reserva pendente, sem PIN da equipe.

## 6. Rotas

| Path | Permissão | View |
|---|---|---|
| `/login` | pública | LoginView |
| `/` | dashboard | DashboardView (Início) |
| `/calendario` | calendar | Timeline + CheckInModal (Mapa) |
| `/ocupacao` | calendar | OccupancyView (14 dias) |
| `/reservas` | calendar | BookingListView |
| `/governanca` | housekeeping | HousekeepingView (Limpeza) |
| `/caixa` | cash | DailyCashRegister |
| `/tarifas` | rates | tarifas / pacotes / cupons / ofertas |
| `/ofertas` | rates | redireciona para `/tarifas?aba=ofertas` |
| `/hospedes` | crm | Hóspedes |
| `/relatorios` | reports | ReportsView |
| `/reservas-diretas` | booking | Site (config da vitrine) |
| `/reservar` | pública | PublicShowcaseView |
| `/configuracoes` | settings | Hotel |
| `/equipe` | users | UserManagementView |

## 7. Telas novas (v1.22–v1.26)

**Dashboard.** Três KPIs (chegadas, saídas, ocupação %). Abas: Chegadas, Saídas, Hóspedes da casa, Pagamentos pendentes. Sidebar *Today's Activity*: vendas, cancelamentos, alertas.

**Ocupação 14 dias.** Linhas = categorias; colunas = dias; cabeçalho = % ocupação + livres; célula 0 = badge vermelho. Navegação ±14 dias.

**Listagem de reservas.** Filtros expansíveis (datas por check-in/out/criação, status, tipo, origem), busca (nome/CPF/código), checkboxes, bulk (status/CSV), paginação.

**Ofertas.** Cadastro em `src/features/rates/`; checkout consulta regras ativas e aplica Pix/mínimo de noites instantaneamente.

**Login.** Google, X ou e-mail da equipe. Primeiro acesso vira administrador. `/reservar` permanece aberto.

## 8. Limites

- Overbooking é regra do documento, não constraint SQL.
- Auth Better Auth entra no login; o fluxo da hospedagem usa o cofre compartilhado.
- Comprovante Pix é nome de arquivo (demo).

## 9. Evolução recente

- v1.22 dashboard Cloudbeds
- v1.23 ocupação 14 dias
- v1.24 listagem avançada de reservas
- v1.25 ofertas %/R$ + regras Pix / dias / mín. noites no checkout público
- v1.26 login real da equipe
- v1.27 regras de hospedagem no cofre (overbooking, check-in, check-out)
- v1.28 folio único, voucher na tela, Pix com comprovante confirma sozinho
- v1.29 nomes e menu da recepção (Início, Mapa, Hóspedes, Site, Hotel); ofertas dentro de Tarifas
