# Fase 0 — Combinado e recorte (Hotel Aurora v1.25.0)

Chão desta conversa: o produto **v1.25.0**. Nada da conversa antiga conta. Não misturar visual, banco e pastas no mesmo recorte.

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
- PIN demo **1234** (Admin/Gerente); cargos atuais

Telas e caminhos atuais (`/`, `/calendario`, `/ocupacao`, `/reservas`, `/governanca`, `/caixa`, `/tarifas`, `/hospedes`, `/relatorios`, `/reservas-diretas`, `/reservar`, `/configuracoes`, `/equipe`). Menu: Início, Mapa, Reservas, Ocupação, Hóspedes, Limpeza, Caixa, Relatórios, Tarifas, Site, Hotel, Equipe. `/ofertas` redireciona para Tarifas → Ofertas.

## Recorte desta fase

**Só travar o baseline.** Nenhum redesign da home, nenhum banco, nenhuma arrumação de pasta.

Auth de contas reais: **ligada** (Fase 3). Persistência: **cofre** (F5 mantém quartos, reservas, folio, preços, caixa e equipe). Site `/reservar` continua público.

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

1. Uma frase: “executa a Fase N”
2. Dizer o que toca e o que não toca
3. Mudar só aquilo
4. Rodar o teste de ouro
5. Extra → lista “depois”

**Estado:** Fase 0 travada · Fase 1–6 feitas · extra e-mail do voucher (v1.30.0) · extra **Pix QR** (v1.31.0) · correção site→mapa (v1.31.1) · mapa sem barras atravessadas (v1.31.2) · extra **adicionais no site** (v1.32.0) · extra **Experiências na vitrine** (v1.32.1) · extra **clique na pré-reserva abre o mapa nela** (v1.32.2) · aviso de pedidos sem faixa (v1.32.3) · tabela de pré-reservas no mapa (v1.32.4). Fase 7 continua fora.

**Próximo recorte recomendado:** extra da lista “depois”. Fase 7 permanece fora.
