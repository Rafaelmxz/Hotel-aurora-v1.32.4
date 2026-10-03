# Mapa da arquitetura — onde está cada assunto

Objetivo: **não reler o repositório**. Abra 1–3 arquivos da tabela. Se o tema não estiver aqui, ele ainda não existe.

Produto: Hotel Aurora PMS v1.32.25  
Repo: https://github.com/Rafaelmxz/Hotel-aurora-v1.32.4

---

## 1. Ordem de leitura

| Se a pergunta for… | Leia só |
|---|---|
| O que já foi combinado / ouro | `docs/FASE-0.md` + `docs/INDICE.md` |
| Como a hospedagem funciona | `docs/SISTEMA.md` |
| Onde editar | este arquivo |
| Regras do recorte | `AGENTS.md` |
| Versão na tela | `src/lib/version.ts` |
| Pastas e fluxo técnico | `docs/ARQUITETURA.md` |

Não abrir `src/mocks/hotelData.ts` nem `src/routeTree.gen.ts` a menos que o recorte seja semente ou rota nova.

---

## 2. Camadas (não pular)

```
rota (src/routes)
  → view (src/features/<domínio>)
    → hook TanStack Query
      → store
        → persistVault / API pública
```

Preço, conflito e status **não** nascem na view. Nascem no store ou em `src/lib/hotel/rules.ts`.

---

## 3. Assunto → arquivo

### Pedido do site e pré-reservas
| Assunto | Arquivo |
|---|---|
| Vitrine / Experiências / checkout | `src/features/direct-booking/PublicShowcaseView.tsx` |
| Catálogo de extras | `src/features/direct-booking/catalog.ts` |
| Store da vitrine | `src/features/direct-booking/bookingStore.ts` |
| Config da vitrine (tela Site) | `src/features/direct-booking/BookingEngineView.tsx` |
| Aviso Início + tabela no mapa | `src/features/direct-booking/PendingBookingsAlert.tsx` |
| Clique na linha foca a barra | `src/features/reservations/CalendarPage.tsx` (`focusStay`) |
| Rota pública | `src/routes/reservar.tsx` |
| Rota config Site | `src/routes/reservas-diretas.tsx` |

### Mapa e reservas
| Assunto | Arquivo |
|---|---|
| Timeline / faixas / arraste | `src/features/reservations/Timeline.tsx` |
| Bloqueio de quarto (não é reserva) | `src/features/reservations/blockStore.ts` + `BlockRoomModal.tsx` |
| Fechar venda por data (tipo) | `src/features/reservations/saleCloseStore.ts` + `CloseSaleModal.tsx` |
| Hook do arraste | `src/lib/useDragScroll.ts` |
| Página do mapa | `src/features/reservations/CalendarPage.tsx` |
| Ficha / check-in | `src/features/reservations/CheckInModal.tsx` |
| Nova reserva na recepção | `src/features/reservations/CreateReservationModal.tsx` |
| Lista / filtros | `src/features/reservations/BookingListView.tsx` |
| Store + status | `src/features/reservations/reservationStore.ts` + `status.ts` |
| Overbooking | `src/features/reservations/overbooking.ts` |
| Folio | `src/features/reservations/folioStore.ts` + `components/FolioStatement.tsx` |
| Voucher | `src/features/reservations/components/StayVoucher.tsx` |
| Ocupação 14 dias | `src/features/reservations/OccupancyView.tsx` |

### Preço
| Assunto | Arquivo |
|---|---|
| `quoteStay` / ocupação ADL+CHD / temporada | `src/features/rates/pricing.ts` + `rateStore.ts` |
| Tarifas | `src/features/rates/rateStore.ts` + `RateManagementView.tsx` |
| Ofertas | `src/features/rates/offerStore.ts` + `OffersView.tsx` |
| Pacotes / cupons | `src/features/rates/PackagesView.tsx` / `PromoCodesView.tsx` |

### Quartos e limpeza
| Assunto | Arquivo |
|---|---|
| Quartos | `src/features/rooms/roomStore.ts` |
| Tipo de quarto (foto / ocupação) | `src/features/rooms/roomTypeStore.ts` + `RoomTypeEditor.tsx` |
| Limpeza | `src/features/rooms/HousekeepingView.tsx` + `housekeeping.ts` |
| Casa (in-house) | `src/features/rooms/HouseMapView.tsx` (cor, visto, seta, recado) |

### Hotel, equipe, caixa
| Assunto | Arquivo |
|---|---|
| Propriedade / horários / cancelamento | `src/features/settings/propertyStore.ts` + `HotelSettingsView.tsx` |
| Bloqueio e fechar venda (cadastro Hotel) | `src/features/settings/InventoryHoldsPanel.tsx` |
| Equipe / PIN / cargos | `src/features/users/` (`roles.ts`, `userStore.ts`, `LoginView.tsx`, `PinChallengeModal.tsx`, `useIdleStaffTimeout.ts`) |
| Diário operacional (audit) | `src/features/audit/auditStore.ts` (array `audit` no cofre; sem tela) |
| Caixa | `src/features/finance/cashStore.ts` + `DailyCashRegister.tsx` |
| Início | `src/features/dashboard/DashboardView.tsx` + `useDashboardData.ts` |
| Menu da equipe | `src/features/layout/AppShell.tsx` |
| Pop-up no mapa | `src/features/reservations/OnMapDialog.tsx` |

### Cofre e servidor
| Assunto | Arquivo |
|---|---|
| Snapshot + merge | `src/lib/hotel/local.ts` `hydrate.ts` `parse.ts` |
| Regras que recusam documento | `src/lib/hotel/rules.ts` |
| API do cofre / pendência pública | `src/lib/hotel/api.ts` |
| Auth | `src/lib/auth/` |
| Versão | `src/lib/version.ts` |

### Rotas
`/`, `/calendario`, `/casa`, `/reservas`, `/ocupacao`, `/governanca`, `/caixa`, `/tarifas`, `/hospedes`, `/relatorios`, `/reservas-diretas`, `/reservar`, `/configuracoes`, `/equipe`, `/login`

---

## 4. O que ainda não existe (não procure no código)

- Channel Manager / distribuição OTA
- Inventário dividido / quarto virtual
- Spaces
- Matriz MinLOS/MaxLOS por data
- MFA
- GA4 / widget embed
- Segmentos de mercado
- Catálogo livre de add-ons (só os 3 de `catalog.ts`)

Se precisar disso: recorte **novo** — criar arquivo + mover a linha de `INDICE.md` C → B.

---

## 5. Comando interno (agente)

1. Ler `docs/INDICE.md` da seção pedida.
2. Abrir no máximo 3 arquivos desta tabela.
3. Não refatorar pasta vizinha.
4. Não mudar o teste de ouro.
5. Subir `APP_VERSION` só se o recorte for visível na tela.
