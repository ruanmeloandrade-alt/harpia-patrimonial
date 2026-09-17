# Hárpia Patrimonial & Co.

Plataforma Hárpia Patrimonial & Co. — site público, catálogo imobiliário, CRM, Inbox, automações, SalesBot, IA, usuários/permissões e área do cliente.

## Domínio

`harpiapatrimonial.com`

## Regra importante

Este projeto usa GitHub como fonte de verdade e **não usa GitHub Actions**.

## Antes de trabalhar no projeto

Leia nesta ordem:

1. [`AGENTS.md`](./AGENTS.md) — regras obrigatórias para qualquer chat/agente.
2. [`docs/REGRAS-DE-PRODUCAO.md`](./docs/REGRAS-DE-PRODUCAO.md) — protocolo obrigatório contra retrabalho, conflito e falso “pronto”.
3. [`docs/BRIEFING-CONSOLIDADO.md`](./docs/BRIEFING-CONSOLIDADO.md) — briefing completo do cliente e do produto.
4. [`docs/ESCOPO-DE-TRABALHO.md`](./docs/ESCOPO-DE-TRABALHO.md) — escopo detalhado, entregas e critérios de aceite.
5. [`docs/CONVERSA-E-DECISOES.md`](./docs/CONVERSA-E-DECISOES.md) — registro das decisões tomadas nas conversas.
6. [`docs/FRENTES-DE-TRABALHO.md`](./docs/FRENTES-DE-TRABALHO.md) — divisão oficial do trabalho paralelo.
7. [`docs/CONTRATOS-ENTRE-MODULOS.md`](./docs/CONTRATOS-ENTRE-MODULOS.md) — contratos entre as frentes.
8. [`docs/STATUS-FRENTES.md`](./docs/STATUS-FRENTES.md) — status, bloqueios e handoffs.

## Trabalho em 5 chats

Quando o usuário disser `Atue na Frente01`, `Frente02`, `Frente03`, `Frente04` ou `Frente05`, leia também o arquivo específico:

- [`Frente01`](./docs/frentes/FRENTE-01.md) — núcleo, autenticação, usuários e permissões.
- [`Frente02`](./docs/frentes/FRENTE-02.md) — site público e área do cliente.
- [`Frente03`](./docs/frentes/FRENTE-03.md) — catálogo interno, publicação e dashboard.
- [`Frente04`](./docs/frentes/FRENTE-04.md) — CRM e Inbox.
- [`Frente05`](./docs/frentes/FRENTE-05.md) — SalesBot, Automatize, IA e integrações preparatórias.

Cada frente possui sua própria branch:

- `frente-01`
- `frente-02`
- `frente-03`
- `frente-04`
- `frente-05`

O desenvolvimento paralelo deve acontecer nessas branches, não diretamente na `main`.

## Regra de qualidade

Nenhuma frente pode declarar `pronto` apenas porque a interface existe. Antes do handoff é obrigatório seguir a Definition of Done em `docs/REGRAS-DE-PRODUCAO.md`, registrar testes executados e marcar como `NÃO VERIFICADO` qualquer item que não pôde ser testado.

## Pente fino e integração

Depois das cinco frentes, o chat/agente integrador deve seguir [`docs/PENTE-FINO-INTEGRACAO.md`](./docs/PENTE-FINO-INTEGRACAO.md).

## Estado atual

- Repositório inicializado.
- Base React/Vite/Node criada.
- Documentação operacional consolidada.
- Escopo dividido em cinco frentes independentes.
- Regras de produção/qualidade definidas e obrigatórias.
- Dados reais de imóveis, funcionários, bots e agentes serão inseridos depois.
- Integrações reais de WhatsApp e Meta ficam para a fase final.

## Referências de produto

MarketOn e Pais e Filhos podem ser consultados como referência de fluxos e aprendizados anteriores, mas a Hárpia deve ser independente e não deve copiar código automaticamente desses projetos.
