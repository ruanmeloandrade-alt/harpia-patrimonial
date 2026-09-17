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

## Trabalho em 5 frentes

Histórico das branches de desenvolvimento:

- [`Frente01`](./docs/frentes/FRENTE-01.md) — núcleo, autenticação, usuários e permissões → `frente-01`.
- [`Frente02`](./docs/frentes/FRENTE-02.md) — site público e área do cliente → `frente-02`.
- [`Frente03`](./docs/frentes/FRENTE-03.md) — catálogo interno, publicação e dashboard → `frente-03`.
- [`Frente04`](./docs/frentes/FRENTE-04.md) — CRM e Inbox → `frente-04`.
- [`Frente05`](./docs/frentes/FRENTE-05.md) — SalesBot, Automatize, IA e integrações preparatórias → `frente-05`.

As cinco frentes já foram reconciliadas. **A `main` é agora a fonte de verdade da base consolidada.** Não fazer merge forçado das branches históricas divergidas.

## Regra de qualidade

Nenhuma frente ou integração pode ser declarada `pronta` apenas porque a interface existe. É obrigatório seguir a Definition of Done em `docs/REGRAS-DE-PRODUCAO.md`, registrar testes executados e marcar como `NÃO VERIFICADO` qualquer item que não pôde ser testado.

## Pente fino e integração

O pente-fino deve seguir [`docs/PENTE-FINO-INTEGRACAO.md`](./docs/PENTE-FINO-INTEGRACAO.md).

Status consolidado: [`docs/STATUS-FRENTES.md`](./docs/STATUS-FRENTES.md).

QA integrado: [`docs/QA-FINAL-2026-09-17.md`](./docs/QA-FINAL-2026-09-17.md) e [`docs/QA-FINAL-PASSADA-2-2026-09-17.md`](./docs/QA-FINAL-PASSADA-2-2026-09-17.md).

## Estado atual

- Cinco frentes funcionais reconciliadas na `main` via PR #5.
- Núcleo/Auth/RBAC, site público, área do cliente, catálogo, dashboard, CRM, Inbox, SalesBot, Automatize, IA e integrações preparatórias presentes na base consolidada.
- Backend/Supabase e fluxos server-side críticos validados conforme documentos de QA.
- Build/typecheck em Node 24 e E2E visual em navegador permanecem explicitamente `NÃO VERIFICADOS` no ambiente atual.
- Não existe `package-lock.json` versionado; a instalação limpa/reprodutível ainda precisa ser confirmada em ambiente com registry npm acessível.
- Dados reais de imóveis, funcionários, bots e agentes serão inseridos conforme instrução posterior.
- Integrações reais de WhatsApp e Meta continuam reservadas para a fase final.
- Hospedagem/deploy final: Hostinger, conforme documentação do projeto.

## Referências de produto

MarketOn e Pais e Filhos podem ser consultados como referência de fluxos e aprendizados anteriores, mas a Hárpia deve ser independente e não deve copiar código automaticamente desses projetos.
