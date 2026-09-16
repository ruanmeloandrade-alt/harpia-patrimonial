# Frente04 — delta mínimo para integração final

Data-base: 16/09/2026
Branch proprietária: `frente-04`

Este arquivo registra somente diferenças da Frente04 que ainda precisam ser preservadas quando o integrador consolidar as branches.

## 1. CRM canônico com fila de leads sem etapa

A partir dos commits:

- `338855c29232a3047510b65b87585c6d99666a7a`
- `866606c28a198503fcbc77b2d568db44850646ec`
- `ed1828cc7640c97024208dc8e18909efadfc8650`
- `5ff635f422259fdb40bdfc494c71923b011ac29a`

`src/features/crm/CrmWorkspace.tsx` passou a ser a entrada canônica e sempre inclui a fila de leads sem etapa.

A implementação visual anterior foi preservada em `src/features/crm/CrmWorkspaceCore.tsx`.

Consequências:

- qualquer import existente de `CrmWorkspace` continua funcionando;
- conversões públicas sem `stageId` deixam de ficar invisíveis;
- não é necessário criar etapa fictícia;
- classificação só pode apontar para etapa pertencente a funil ativo;
- `Front04CrmScreen` não duplica mais a fila.

No merge final, preservar os três arquivos juntos:

- `src/features/crm/CrmWorkspace.tsx`;
- `src/features/crm/CrmWorkspaceCore.tsx`;
- `src/features/crm/UnassignedLeadsQueue.tsx`.

## 2. Inbox desacoplada da implementação da Frente05

A versão atual da Frente04 de `src/features/inbox/InboxWorkspace.tsx` recebe por props:

- `salesBots`;
- `aiAgents`.

A Inbox não deve importar diretamente repositories da Frente05. O integrador fornece somente opções ativas no formato `{ id, name }`.

Motivo: CRM/Inbox é propriedade da Frente04 e não deve conhecer a persistência interna da Frente05.

## 3. Adapter F04↔F05 mais novo

Preservar a versão da branch Frente04 de `src/features/crm/front05Adapter.ts`.

Ela contém correções que evitam:

- retomar execução pausada de um SalesBot diferente do atualmente selecionado;
- apresentar status de execução antiga para outro `botId`/`agentId`;
- invocar novamente o mesmo agente IA quando a execução observada já está `running`.

A composição da Frente01 pode continuar fornecendo os ports reais de SalesBot/IA; apenas o adapter deve permanecer o da Frente04.

## 4. Estado atual das dependências

Já observado na Frente01:

- CRM/Inbox com persistência compartilhada Supabase;
- site público chamando `public-lead-ingest`;
- dashboard usando a mesma fonte CRM;
- CRM events ligados ao Automatize;
- SalesBot com CRM actions reais;
- IA com runtime seguro;
- rotas internas CRM/Inbox existentes.

Portanto esses pontos não devem voltar a ser listados como bloqueios de implementação. O que resta é QA integrado, usuário real/RBAC, build/typecheck e sincronização destes deltas.

## 5. Semáforo

- 🟠 CRM/Kanban/Lead 360: funcionalidade própria fechada; falta sync/build/E2E integrado.
- 🟠 Inbox: funcionalidade própria e seleção explícita fechadas; falta sync/build/E2E integrado.
- 🟠 Site→CRM, Dashboard CRM e F05: contratos/composição já existem; falta teste ponta a ponta.
- 🔴 Validação final do usuário: ainda indisponível sem usuário interno real e ambiente executável.

Nenhum item deve ser marcado 🟢 apenas pela existência do código.
