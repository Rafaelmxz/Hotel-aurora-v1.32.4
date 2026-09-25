# Índice — Hotel Aurora PMS v1.32.47

Use **antes** de abrir código. `[x]` = no produto. Não misture um `[ ]` com outro no mesmo recorte.

- Combinado: [FASE-0.md](./FASE-0.md)
- Lógica: [SISTEMA.md](./SISTEMA.md)
- Onde editar: [MAPA-ARQUITETURA.md](./MAPA-ARQUITETURA.md)
- Regras do agente: [AGENTS.project.md](../AGENTS.project.md)

---

## A. Congelado (não reabrir sem pedido explícito)

- [x] Fluxo de ouro: site pagar no check-in → pendente → confirma → mapa → check-in (quarto limpo) → checkout saldo 0 → quarto sujo
- [x] Pix QR / copia-e-cola no site confirma sozinho e lança sinal (não substitui o ouro)
- [x] Folio único (diárias + consumos − pagamentos = saldo)
- [x] Voucher na tela + e-mail + cópia em Hotel
- [x] Cofre (F5 + documento; recusa overbooking / check-in sujo / checkout com saldo)
- [x] Login da equipe (Google, X, e-mail) + cargos + PIN 1234
- [x] Nomes da recepção: Início, Mapa, Hóspedes, Site, Hotel
- [x] Menu lateral com ícones (recolhido / expandido)
- [x] Channel Manager / Booking / Airbnb **fora** desta linha
- [x] Relatório fiscal / NFC-e **fora**
- [x] Não clonar marca de outro PMS

---

## B. Executado nesta linha (v1.22 → v1.32.16)

### Produto / recepção
- [x] Início estilo rotina do dia (chegadas, saídas, ocupação, atividade)
- [x] Mapa 21 dias (timeline quartos × dias)
- [x] Barras empilhadas em faixas (não atravessam)
- [x] Arraste horizontal do mapa (sem travar; clique ≠ arraste)
- [x] Bloqueio de quarto no mapa sem criar reserva falsa
- [x] Fechar venda por data (tipo + noites, sem mudar preço)
- [x] Hotel: bloquear/desbloquear quarto e fechar/reabrir venda
- [x] Ficha da reserva (confirmar, check-in, conta, voucher)
- [x] Ficha do balcão: datas → pessoas → quarto riscado → hóspede → pré-reserva ou criar
- [x] Listagem de reservas com filtros / CSV
- [x] Ocupação 14 dias por categoria
- [x] Limpeza (limpo / sujo / em limpeza / manutenção)
- [x] Casa (esqueleto: casinha + bolinha de limpeza)
- [x] Caixa do dia + turno
- [x] Tarifas, temporadas, pacotes, cupons, ofertas
- [x] Hóspedes + histórico
- [x] Relatórios (ocupação, ADR, RevPAR, DRE simples)
- [x] Equipe / RBAC

### Site e pedido
- [x] Vitrine `/reservar` (busca + checkout)
- [x] Funil do motor: lista vertical + banner que encolhe + extras + dados
- [x] Motor: check-in hoje / check-out +1; banner não treme
- [x] Aba da equipe: Motor de reservas
- [x] Pedido do site com ID único (`res-` + UUID) — não some no F5
- [x] Pagar no check-in entra **pendente**
- [x] Aviso de pré-reservas no Início (sem tabela)
- [x] Tabela simples de pré-reservas **só no mapa**
- [x] Clique na linha → semana anda, barra destaca, ficha abre (`?reserva=id`)
- [x] Experiências na vitrine (cards: café, traslado, cama extra)
- [x] Extra vai para o folio como consumo (preço do catálogo, não do cliente)
- [x] Extra persiste se mudar datas; “Nova reserva” zera

### Persistência / docs
- [x] Cofre local + `hotel_vault` + pendências públicas
- [x] Push protegido (não apaga pedido do site)
- [x] `docs/SISTEMA.md` + repo GitHub `Rafaelmxz/Hotel-aurora-v1.32.4`
- [x] Índice + mapa de arquitetura + `AGENTS.project.md` (regras de recorte)

---

## C. Falta executar (fila — um recorte por vez)

### Casa (in-house)
- [x] Tela Casa esqueleto (casinha por UH + sinal de limpeza; camareira continua em Limpeza)
- [ ] Casa: cores vago / ocupado / indisponível / pré-reserva + check na confirmada
- [ ] Casa: setas chegada hoje / saída hoje
- [ ] Casa: recado em cima (carta / coração / bolo)

### Mapa
- [ ] Célula vazia abre Nova reserva naquele quarto e data (bloqueio só no botão)

### Configuração da propriedade
- [x] Cadastro rico de tipo de quarto (fotos, comodidades, adultos/crianças na tarifa)
- [x] Horários e regras de cancelamento editáveis de ponta a ponta
- [ ] Segmentos de mercado (balcão / site / corporativo)
- [ ] Catálogo livre de Experiências (não só os 3 fixos)
- [ ] Preço e texto das Experiências só em Site / Hotel

### Tarifas e disponibilidade
- [ ] Matriz dia a dia (preço por data)
- [ ] MinLOS / MaxLOS / fechado para chegada ou saída
- [x] Taxa por hóspede extra na tarifa (além da cama extra)
- [x] Grelha 1/2/3/4 ADL + 1/2 CHD por tipo (A1)

### Motor / site
- [ ] Incorporar o motor em site externo (iframe / snippet)
- [ ] Idiomas da vitrine
- [ ] Textos “sem disponibilidade” / cores da marca no motor
- [ ] Analytics (GA4) — só se o hotel pedir

### Segurança
- [ ] MFA
- [ ] Política de sessão / timeout
- [ ] Auditoria (“quem mudou o quê”)

### Fora desta linha (não puxar no mesmo recorte)
- [ ] Channel Manager / OTAs
- [ ] Inventário dividido / quarto virtual / hostel por cama
- [ ] Spaces (salas / áreas)
- [ ] Assistente de implantação
- [ ] WhatsApp / marketing
- [ ] Inteligência de preço / tarifas de concorrente
- [ ] Fechadura eletrônica / totem
- [ ] Relatório fiscal / INE / NFC-e
- [ ] Multi-propriedade

---

## D. Como usar num recorte

1. Escolher **uma** linha `[ ]` da seção C.
2. Escrever em `docs/FASE-0.md` o recorte em 5–8 linhas (tela, regra, o que não muda).
3. Mexer só nas pastas do mapa.
4. Rodar o teste de ouro.
5. Marcar `[x]` aqui e, se a tela mudou, subir o PATCH da versão.
