# Hotel Aurora — regras do produto (obrigatórias)

Este arquivo vale para **todo recorte** neste repositório. Precedência: pedido do usuário no chat > este arquivo > `docs/FASE-0.md`.

### Leitura mínima antes de editar qualquer código

Sempre, antes de editar qualquer código:

1. `docs/INDICE.md` — o que já está feito / o que falta / o que está congelado
2. `docs/MAPA-ARQUITETURA.md` — qual arquivo abrir (no máximo 3)
3. `docs/FASE-0.md` — teste de ouro e o que não misturar

Não reler o repositório. Não abrir `src/mocks/hotelData.ts` nem
`src/routeTree.gen.ts` sem o recorte ser semente ou rota nova.

### Recorte

- Um item `[ ]` da seção C do índice por vez. Se o pedido caber em dois,
  recusar e pedir escolha.
- Não misturar visual, banco e pastas no mesmo passo.
- Extra vai para a seção C / lista “depois”. Não vira `// TODO` espalhado.
- Não clonar marca de outro PMS. Channel Manager, fiscal, WhatsApp e PIE ficam
  fora até o índice marcar.

### Teste de ouro (não quebrar)

Site pagar no check-in → pendente → confirma → mapa → check-in (quarto limpo)
→ checkout saldo 0 → quarto sujo.

Pix QR confirma sozinho e lança sinal — **não substitui** o ouro.

### Código

- Camada: rota → view → hook Query → store → cofre. Preço, conflito e status
  **não** nascem na view.
- Uma fonte por regra: overbooking só em `overbooking.ts` /
  `src/lib/hotel/rules.ts`.
- Domínio = pasta fechada. Reserva não importa caixa. Extra não calcula preço
  na view — usa `catalog.ts` + `quoteStay`.
- Três linhas iguais valem mais que abstração prematura.
- Recorte visível na tela → patch em `src/lib/version.ts`. Documentação pura
  não sobe versão.
- No arquivo que o recorte **criar ou mudar de regra**, 8 linhas no topo: o
  que a tela pode, o que é proibido, qual store grava. Não documentar função
  que não mudou.

### Depois de executar

1. Rodar o teste de ouro (ou o recorte equivalente se não tocar hospedagem).
2. Marcar `[x]` em `docs/INDICE.md`.
3. Se nasceu arquivo novo, uma linha em `docs/MAPA-ARQUITETURA.md`.
4. Atualizar o **Estado** em `docs/FASE-0.md`.
