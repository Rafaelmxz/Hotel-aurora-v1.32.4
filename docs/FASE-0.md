# Fase 0 — Combinado e recorte (Hotel Aurora v1.32.8)

Chão desta conversa: o produto **v1.32.8**. Nada da conversa antiga conta. Não misturar visual, banco e pastas no mesmo recorte.

**Antes de qualquer recorte:** [INDICE.md](./INDICE.md) (feito/falta) → [MAPA-ARQUITETURA.md](./MAPA-ARQUITETURA.md) (onde editar) → [AGENTS.md](../AGENTS.md) (regras).

## Congelado (não reinventar)

Fluxo da hospedagem:

1. Hóspede pede no site (`/reservar`)
2. Pré-reserva **pendente** (pagar no check-in) — ou Pix com comprovante **confirma sozinho**
3. Recepção confirma a pré-reserva (quando pendente) → **confirmada**
4. Check-in (só quarto limpo)
5. Conta (folio único): diárias + consumos − pagamentos
6. Check-out só com saldo zerado
7. Quarto fica **sujo**

Regras:

- Não ocupar o mesmo quarto nas mesmas noites
- Check-in bloqueado se sujo ou em manutenção
- Check-out bloqueado se tem saldo
- PMS + vitrine, **sem** Booking/Airbnb nesta etapa
- Uma fonte só de preço, vaga e reserva
- PIN de elevação para Admin/Gerente: definido na Equipe; semente e login não criam PIN

Telas e caminhos atuais (`/`, `/calendario`, `/ocupacao`, `/reservas`, `/governanca`, `/caixa`, `/tarifas`, `/hospedes`, `/relatorios`, `/reservas-diretas`, `/reservar`, `/configuracoes`, `/equipe`). Menu: Início, Mapa, Reservas, Ocupação, Hóspedes, Limpeza, Caixa, Relatórios, Tarifas, Site, Hotel, Equipe. `/ofertas` redireciona para Tarifas → Ofertas.

## Recorte desta fase

**Diário operacional no cofre (sem tela).**

Tela: nenhuma neste recorte.
Regra: criar/confirmar/check-in/checkout, cargo, PIN, elevação no seletor e fechar caixa geram evento `audit` no cofre, com o usuário da sessão. Pedido do site entra como Link público. Tarifas e tela de leitura ficam de fora. Não é prova contra DevTools.
Não muda: ouro, PIN vazio, idle, hash, MFA, pastas.

## Teste de ouro (repetir no fim de cada fase)

1. Site pede reserva **pagando no check-in**
2. Aparece para a recepção (pendente)
3. Confirma
4. Cai no mapa
5. Check-in
6. Checkout com conta zerada
7. Quarto fica sujo

Se um desses quebrar, a fase volta atrás.

Pix com comprovante no site confirma sozinho e lança o sinal — **não** substitui o teste de ouro.

## Fases seguintes (um recorte por vez)

| Fase | Recorte | Não entra |
|---|---|---|
| **1** | Home no estilo da rotina Cloudbeds (data, 3 cartões, abas, atividade do dia, criar reserva). Mesmas tabelas de reserva/quarto. | Banco, Pix real, OTA, pastas |
| **2** | Cofre: quarto e reserva sobrevivem ao F5; depois hóspede, preço, caixa, equipe | Visual novo, OTA |
| **3** | Login real + cargos | Pix bancário |
| **4** | Regras no cofre (não só na tela) | Redesign |
| **5** | Fechar o hóspede: folio único, voucher; decidir pendente vs confirma sozinho; Pix/QR e adicionais depois | Channel Manager |
| **6** | Arrumação de nomes e menu | Mudar regra |
| **7** | Fora: OTA, copiar marca Cloudbeds, fiscal pesado, WhatsApp, PIE | — |

## Lista “depois”

Ideia extra vai para cá. Não entra no recorte aberto.

- Channel Manager (Booking, Airbnb)
- Relatório fiscal
- WhatsApp / marketing
- Inteligência de preço

## Como executar sem misturar

1. Uma frase: “executa o recorte X” (um item `[ ]` do índice)
2. Dizer o que toca e o que não toca (5–8 linhas neste arquivo)
3. Abrir no máximo 3 arquivos do mapa; mudar só aquilo
4. Rodar o teste de ouro
5. Extra → seção C do índice (não vira `// TODO` no código)
6. Marcar `[x]` no índice; se a tela mudou, patch em `src/lib/version.ts`

**Estado:** Fase 0 travada · Fase 1–6 feitas · extra e-mail do voucher (v1.30.0) · extra **Pix QR** (v1.31.0) · correção site→mapa (v1.31.1) · mapa sem barras atravessadas (v1.31.2) · extra **adicionais no site** (v1.32.0) · extra **Experiências na vitrine** (v1.32.1) · extra **clique na pré-reserva abre o mapa nela** (v1.32.2) · aviso de pedidos sem faixa (v1.32.3) · tabela de pré-reservas no mapa (v1.32.4) · **bloqueio de quarto no mapa** (v1.32.5) · **horários e cancelamento** (v1.32.8) · **cadastro rico do tipo de quarto** (v1.32.11) · **fechar venda por data** (v1.32.12) · **Hotel bloqueio e fechar/reabrir venda** (v1.32.13) · **ficha do balcão** (v1.32.14) · **menu lateral** (v1.32.16) · **mapa compacto + arrastar reserva** (v1.32.18) · **pop-up no mapa sem sair da tela** (v1.32.20) · **tela Casa esqueleto** (v1.32.22) · **funil do motor de reservas** (v1.32.23) · **datas e banner do motor** (v1.32.24) · **grelha de ocupação A1** (v1.32.25) · **simulação = tabela** (v1.32.26) · **tarifa nova não mexe reserva feita** (v1.32.27) · **+ADL / +CHD (A2)** (v1.32.28) · **trava de capacidade na simulação e na criação** (v1.32.29) · **recepção confirma com aviso + taxa extra** (v1.32.30) · **calendário pintado A3** (v1.32.31) · **temporada pinta o mês** (v1.32.32) · **fechar venda no calendário A4** (v1.32.33) · **checkout/pagamento não fecha sozinho** (v1.32.34) · **clique no vazio do mapa cria reserva B1** (v1.32.35) · **Casa: cores + visto B2** (v1.32.36) · **Casa: seta entra/sai B3** (v1.32.37) · **Casa: recado B4** (v1.32.38) · **site mostra preço da grelha C1** (v1.32.39) · **Buscar não derruba a reserva** (v1.32.40) · **criança no 2+1 não some a vaga** (v1.32.41) · **N quartos livres C2** (v1.32.42) · **adultos no motor com 01** (v1.32.43) · **adultos sobe 1 a 1, não pula para 6** (v1.32.44) · **segmento balcão / site C3** (v1.32.45) · **pagamento do site usa a diária do site** (v1.32.46) · **FNRH no check-in C4** (v1.32.47) · **AGENTS.md única fonte de regras do recorte** · **PIN sem semente 1234** (v1.32.48) · **idle 15 min da sessão elevada** (v1.32.49) · **PIN de elevação sempre vazio + idle 15 min produção** (v1.32.50) · **diário operacional no cofre** (v1.32.51). Fase 7 continua fora.

**Próximo recorte recomendado:** um item da seção C de [INDICE.md](./INDICE.md). Fase 7 permanece fora.
