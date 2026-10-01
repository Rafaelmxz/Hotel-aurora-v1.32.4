# Hotel Aurora PMS — v1.32.4

Sistema de **gestão hoteleira (PMS)** do Hotel Aurora: início da rotina, mapa de reservas, ocupação 14 dias, limpeza, caixa, tarifas e ofertas, hóspedes, relatórios, equipe com login e PIN, e site público.

Esta versão é um **protótipo funcional** do PMS: fluxo de hospedagem congelado, home da rotina, cofre, login da equipe, folio, voucher, Pix QR, Experiências na vitrine e mapa com tabela de pré-reservas.

**Descrição do sistema (resumo, arquitetura e lógica):** [docs/SISTEMA.md](docs/SISTEMA.md)

Índice (feito / falta): [docs/INDICE.md](docs/INDICE.md)

Onde cada assunto mora: [docs/MAPA-ARQUITETURA.md](docs/MAPA-ARQUITETURA.md)

Regras de recorte (obrigatórias): [AGENTS.md](AGENTS.md)


Repositório desta versão: [Rafaelmxz/Hotel-aurora-v1.32.4](https://github.com/Rafaelmxz/Hotel-aurora-v1.32.4)


Arquitetura técnica: [docs/ARQUITETURA.md](docs/ARQUITETURA.md)

Combinado de recortes e teste de ouro: [docs/FASE-0.md](docs/FASE-0.md)


## O que o sistema faz

| Módulo | Tela | Função |
|---|---|---|
| Início | `/` | Rotina do dia: chegadas, saídas, ocupação, abas e atividade |
| Mapa | `/calendario` | Timeline quartos × dias, pré-reservas, check-in/out, conta e pagamento |
| Ocupação | `/ocupacao` | Matriz 14 dias por categoria, % do dia e vagas (0 = lotado) |
| Reservas | `/reservas` | Filtros avançados, tabela completa, bulk e paginação |
| Limpeza | `/governanca` | Status dos quartos: limpo, sujo, em limpeza, manutenção |
| Caixa | `/caixa` | Movimento do dia por Pix/cartão/dinheiro e fechamento de turno |
| Tarifas | `/tarifas` | Diária, temporadas, pacotes, cupons e ofertas de pagamento |
| Hóspedes | `/hospedes` | Ficha, LTV, histórico e busca na reserva |
| Relatórios | `/relatorios` | Ocupação, ADR, RevPAR, DRE simplificado, CSV/impressão |
| Site | `/reservas-diretas` e `/reservar` | Página do hóspede: busca de datas e checkout |
| Hotel | `/configuracoes` | Perfil da propriedade, Pix, horários, branding, e-mails enviados |
| Equipe | `/equipe` | Usuários, cargos e PIN de Admin/Gerente |
| Entrar | `/login` | Conta da equipe: Google, X ou e-mail |

## Como rodar

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:8080`.

```bash
npm run typecheck
npm run build
```

## Stack

- React 19 + TypeScript + Vite (TanStack Start)
- Tailwind CSS v4 + componentes Radix
- TanStack Router (rotas em arquivo) e TanStack Query
- Recharts, date-fns, Sonner

## Dados e persistência

Nesta versão o **cofre** guarda o hotel e recusa o que a tela não deveria deixar passar: mesmo quarto nas mesmas noites, check-in em quarto sujo/manutenção e check-out com saldo. Check-out deixa o quarto sujo. Recarregar a página (F5) mantém os dados.

A recepção entra com conta real (Google, X ou e-mail). O primeiro acesso vira administrador; os próximos entram como recepção. Quem usa o mesmo e-mail da Equipe assume aquele cargo, sem PIN. Troca para **Gerente** ou **Administrador** de outro perfil exige PIN definido na Equipe. O site do hóspede (`/reservar`) continua aberto, sem login.

## Fluxo principal

1. Hóspede entra em `/reservar`, busca datas e confirma. **Pagar no check-in** fica **pendente** (a recepção confirma). **Pix com comprovante** confirma sozinho e lança o sinal no folio. Pix aplica ofertas ativas no total.
2. Banner no mapa lista pré-reservas pendentes. A conta (folio) reúne diárias, consumos e pagamentos. O voucher imprime na tela.
3. Check-in (quarto limpo) → lançamentos na mesma conta.
4. Check-out só com saldo zerado → quarto fica **sujo**.

## Versão

`VERSION` e `src/lib/version.ts` estão em **v1.29.0**. O selo aparece no canto inferior direito.
