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
- o realtime só remonta a UI quando o snapshot realmente mudou, evitando reset por eco do próprio save local.

Não é mais obrigatório trocar o import da Frente01 por `Front04CrmScreen`; a proteção está no `CrmWorkspace` canônico.

## 2. Service CRM com hardening de campos

Preservar juntos:

- `src/features/crm/service.ts`;
- `src/features/crm/serviceCore.ts`.

`service.ts` é o contrato canônico e aplica validação adicional sobre o core:

- `select`/`multiselect` exigem ao menos uma opção;
- opções são limpas e deduplicadas;
- campo inativo não aceita alteração;
- texto/data, número, booleano, select e multiselect rejeitam valores incompatíveis;
- `select`/`multiselect` só aceitam valores declarados nas opções.

Isso protege tanto a UI quanto `updateField` vindo da Frente05/Automatize.

## 3. Inbox canônica acompanha runtime realtime

Preservar juntos:

- `src/features/inbox/InboxWorkspace.tsx`;
- `src/features/inbox/InboxWorkspaceCore.tsx`;
- `src/features/inbox/service.ts`.

`InboxWorkspace.tsx` mantém o caminho de importação atual. A troca de `crmService`, `inboxService` ou `automationPort` é absorvida sem reset visual quando os snapshots são equivalentes; remount só ocorre quando CRM/Inbox realmente mudaram.

O `InboxService` atual também garante:

- não é possível marcar canal como conectado sem transporte real configurado;
- desconectar remove `externalThreadId`;
- mensagem recebida é deduplicada por `conversationId + externalMessageId`, sem colisão indevida entre conversas.

## 4. Inbox desacoplada da Frente05

A versão F04 recebe por props:

- `salesBots`;
- `aiAgents`;
- `automationPort`.

Não preservar a versão integrada antiga que importa diretamente repositories internos da Frente05. O integrador deve montar as opções ativas e fornecê-las no formato `{ id, name }`.

## 5. Adapter F04↔F05 mais novo

Preservar juntos:

- `src/features/crm/front05Adapter.ts`;
- `src/features/crm/front05AdapterCore.ts`.

O adapter canônico mantém o vínculo de execução por lead/conversa em escopo de módulo, para sobreviver à recriação do `automationPort` causada pelo realtime da Frente01 durante a mesma sessão.

Ele também evita:

- retomar execução pausada de outro SalesBot;
- exibir status de execução antiga para outro `botId`/`agentId`;
- invocar novamente o mesmo agente IA quando já está `running`;
- tentar pausar execução já encerrada;
- manter ponteiro de execução concluída/falha/não encontrada.

A Frente01 continua responsável por fornecer os ports reais.

## 6. Persistência integrada: somente Frente01

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

## 7. Backend/segurança observado

- Security Advisor do Supabase dedicado: `0` lints no QA mais recente;
- Performance Advisor: somente INFO de índices ainda não utilizados;
- última consulta: `auth.users = 0` e usuários internos ativos = `0`;
- existem as linhas compartilhadas de estado `crm` e `inbox`.

## 8. Pendente fora da Frente04

- branch Frente01 ainda foi observada com versões anteriores de `CrmWorkspace`, `InboxWorkspace` e `front05Adapter`;
- `/interno/crm` ainda exige `crm.manage` e `/interno/inbox` exige `inbox.manage`, sem acesso para perfis somente `*.view`;
- ainda não existe usuário interno real para E2E autenticado;
- build/typecheck consolidado ainda não foi executado;
- F05 ainda precisa de recursos reais configurados para E2E.

## Semáforo

- 🟠 CRM/Kanban/Lead 360 — escopo próprio fechado e endurecido; falta sync/build/E2E.
- 🟠 Inbox — escopo próprio fechado, realtime e invariantes de transporte tratados; falta sync/build/E2E.
- 🟠 Site→CRM/Dashboard/F05 — composição disponível; falta ensaio ponta a ponta.
- 🔴 Validação final — depende de usuário real, ambiente integrado executável e QA do usuário.
