# Frente04 — delta mínimo para integração final

Data-base: 16/09/2026
Branch proprietária: `frente-04`

Este arquivo registra somente diferenças da Frente04 que precisam ser preservadas no merge final.

## 1. CRM canônico inclui fila sem etapa

Preservar juntos:

- `src/features/crm/CrmWorkspace.tsx`;
- `src/features/crm/CrmWorkspaceCore.tsx`;
- `src/features/crm/UnassignedLeadsQueue.tsx`.

Resultado:

- imports existentes de `CrmWorkspace` continuam válidos;
- conversões públicas sem `stageId` permanecem visíveis;
- não existe etapa fictícia/default inventada;
- classificação só oferece etapas de funis ativos;
- troca de `CrmService` causada pelo realtime remonta o core e atualiza o snapshot visual.

Não é mais obrigatório trocar o import da Frente01 por `Front04CrmScreen`; a proteção está no `CrmWorkspace` canônico.

## 2. Inbox canônica acompanha runtime realtime

Preservar juntos:

- `src/features/inbox/InboxWorkspace.tsx`;
- `src/features/inbox/InboxWorkspaceCore.tsx`.

`InboxWorkspace.tsx` mantém o caminho de importação atual, mas remonta o core quando mudam:

- `crmService`;
- `inboxService`;
- `automationPort`.

Isso evita continuar exibindo conversa/CRM/status de automação de um runtime substituído pelo realtime da Frente01.

## 3. Inbox desacoplada da Frente05

A versão F04 recebe por props:

- `salesBots`;
- `aiAgents`;
- `automationPort`.

Não preservar a versão integrada antiga que importa diretamente repositories internos da Frente05. O integrador deve montar as opções ativas e fornecê-las no formato `{ id, name }`.

## 4. Adapter F04↔F05 mais novo

Preservar a versão da Frente04 de `src/features/crm/front05Adapter.ts`.

Ela evita:

- retomar execução pausada de outro SalesBot;
- exibir status de execução antiga para outro `botId`/`agentId`;
- invocar novamente o mesmo agente IA quando já está `running`.

A Frente01 continua responsável por fornecer os ports reais.

## 5. Persistência integrada: somente Frente01

A Frente01 já possui:

- Supabase compartilhado;
- `platform_module_state`;
- optimistic locking;
- merge seguro de conversões públicas;
- realtime entre sessões.

Por isso:

- `sharedStatePersistence.ts` foi removido da Frente04;
- o export correspondente foi removido de `src/features/crm/index.ts`;
- não restaurar esse caminho no merge.

## 6. Backend/segurança observado

- Security Advisor do Supabase dedicado: `0` lints no QA mais recente;
- Performance Advisor: somente INFO de índices ainda não utilizados;
- ambiente continua sem CRM/Inbox fictícios.

## 7. Pendente fora da Frente04

- branch Frente01 ainda foi observada com versões anteriores de `CrmWorkspace`, `InboxWorkspace` e `front05Adapter`;
- `/interno/crm` ainda exige `crm.manage` e `/interno/inbox` exige `inbox.manage`, sem acesso para perfis somente `*.view`;
- ainda não existe usuário interno real para E2E autenticado;
- build/typecheck consolidado ainda não foi executado;
- F05 ainda precisa de recursos reais configurados para E2E.

## Semáforo

- 🟠 CRM/Kanban/Lead 360 — escopo próprio fechado, inclusive realtime visual; falta sync/build/E2E.
- 🟠 Inbox — escopo próprio fechado, inclusive troca de runtime; falta sync/build/E2E.
- 🟠 Site→CRM/Dashboard/F05 — composição disponível; falta ensaio ponta a ponta.
- 🔴 Validação final — depende de usuário real, ambiente integrado executável e QA do usuário.
