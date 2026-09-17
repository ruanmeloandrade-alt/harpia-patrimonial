# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`

## Status visual

- 🟠 CRM/Kanban/Lead 360 — implementação, hardening, realtime visual, fila sem etapa, modo leitura e aviso de persistência já integrados na Frente01; backend RBAC real validado; falta build/UI E2E.
- 🟠 Inbox — implementação, invariantes de transporte, realtime visual, RBAC fino e integração F05 já integrados na Frente01; backend RBAC real validado; falta build/UI E2E.
- 🟢 RBAC backend CRM/Inbox — `view/manage`, leitura RLS, bloqueio de escrita e diretório de responsáveis validados com identidades temporárias autenticadas e depois removidas.
- 🟠 Persistência multiusuário — infraestrutura oficial da Frente01 com Supabase/optimistic locking/realtime; falha de persistência agora é exibida na UI; falta ensaio visual de conflito real entre sessões.
- 🟠 Site→CRM / Dashboard / F05 — composição integrada existe na Frente01; falta E2E visual/autenticado.
- 🔴 Build/typecheck consolidado — ainda não verificado pela árvore integrada.
- 🔴 Validação final pelo usuário — ainda não executada.

Nenhum item de produto recebe 🟢 apenas porque o código existe.

## Sincronização atual com a Frente01

A Frente01 já absorveu o delta atual de RBAC/persistência da Frente04.

No head observado da Frente01 (`603af07f66f52428d9f21de32ef441831eb82ad7`):

- `/interno/crm` aceita `CRM_VIEW` ou `CRM_MANAGE`;
- `/interno/inbox` aceita `INBOX_VIEW` ou `INBOX_MANAGE`;
- `IntegratedCrm` passa `canManage={CRM_MANAGE}`;
- `IntegratedInbox` passa capacidades separadas de Inbox, CRM, SalesBot e IA;
- `PersistenceErrorNotice.tsx` está presente;
- `readOnlyAccess.ts` está presente;
- wrappers atuais de CRM/Inbox estão presentes.

A Frente04 e a Frente01 continuam com históricos de branch divergentes, mas o comportamento necessário da F04 está presente na árvore integrada observada.

## CRM entregue

- funis configuráveis;
- etapas configuráveis, reordenação e exclusão protegida;
- Kanban e movimentação manual;
- Lead 360;
- responsável;
- tags;
- campos personalizados tipados e validados;
- tarefas/próximas ações;
- histórico;
- eventos CRM;
- fila de leads sem etapa;
- conversões sem etapa continuam visíveis;
- nenhuma etapa/default fictícia;
- classificação somente para funil ativo;
- realtime sem reset visual por eco do próprio save;
- falha de persistência compartilhada aparece na UI;
- `CrmWorkspace` aceita `canManage?: boolean`;
- em modo leitura, métodos mutáveis do `CrmService` são bloqueados no contrato e a fila sem etapa não permite classificação.

Arquitetura canônica:

- `CrmWorkspace.tsx` — integração/realtime/RBAC;
- `CrmWorkspaceCore.tsx` — implementação visual;
- `service.ts` — hardening;
- `serviceCore.ts` — CRUD/base;
- `readOnlyAccess.ts` — proteção de mutações por capacidade;
- `PersistenceErrorNotice.tsx` — aviso de falha remota.

## Inbox entregue

- três colunas;
- conversa + contexto CRM;
- sessão interna sem simular WhatsApp;
- envio real bloqueado sem transporte;
- texto/áudio/imagem/vídeo/documento/form previstos no contrato;
- responsável, etapa, tags, campos e tarefas pelo contexto da conversa;
- seleção explícita de SalesBot e agente IA;
- realtime sem reset visual quando snapshots são equivalentes;
- canal não pode ficar `connected` sem transporte real;
- dedupe de mensagem externa por conversa + ID externo;
- falhas de persistência CRM/Inbox aparecem na UI.

### RBAC fino da Inbox

`InboxWorkspace` aceita:

- `canManageInbox?: boolean`;
- `canManageCrm?: boolean`;
- `canManageSalesBot?: boolean`;
- `canManageAiAgent?: boolean`;
- `canManage?: boolean` como atalho legado.

As quatro capacidades são independentes:

- Inbox controla sessão/envio/mutação de conversa;
- CRM controla estágio/responsável/tags/campos/tarefas;
- SalesBot controla start/pause do bot;
- IA controla start/pause do agente.

Status de automação continua legível quando o usuário possui acesso de leitura, sem liberar comando de gestão.

## QA real de RBAC executado

Documento detalhado: `docs/frentes/FRENTE-04-RBAC-QA.md`.

Foram criadas identidades temporárias de QA autorizadas, sem senha e sem dados operacionais fictícios:

- administrador temporário;
- usuário interno somente leitura.

Resultados observados com `auth.uid()` simulado por JWT `authenticated`:

### Administrador

- `crm.view`/`crm.manage` → `true`;
- `inbox.view`/`inbox.manage` → `true`;
- `salesbot.view`/`salesbot.manage` → `true`;
- `ai.view`/`ai.manage` → `true`.

### Somente leitura

- `crm.view` → `true`;
- `crm.manage` → `false`;
- `inbox.view` → `true`;
- `inbox.manage` → `false`;
- `salesbot.view` → `true`;
- `salesbot.manage` → `false`;
- `ai.view` → `true`;
- `ai.manage` → `false`.

Com o usuário somente leitura:

- leitura de `platform_module_state` CRM/Inbox funcionou;
- tentativa de `save_platform_module_state` foi recusada com `not authorized to write module state`;
- `list_internal_assignees()` funcionou.

Após o ensaio:

- usuários temporários restantes = `0`;
- grupos temporários restantes = `0`;
- CRM revision = `0`;
- Inbox revision = `0`;
- nenhum lead/conversa/dado operacional fictício foi criado.

## Integração Frente05

O adapter F04↔F05:

- recebe `botId`/`agentId` explícitos;
- preserva `executionId` por lead/conversa durante recriações de runtime na mesma sessão;
- só retoma o mesmo SalesBot;
- não reaproveita status de recurso diferente;
- evita invocação duplicada do mesmo agente já `running`;
- não pausa execução já encerrada;
- limpa ponteiros concluídos/falhos/not_found;
- expõe ações CRM reais para Automatize;
- converte eventos CRM para o contrato F05.

## Persistência oficial

A fonte de verdade permanece na Frente01:

- `platform_module_state`;
- RLS;
- RPC de save;
- optimistic locking;
- merge seguro de leads públicos;
- Supabase Realtime.

`sharedStatePersistence.ts` não deve ser restaurado na Frente04.

## Backend observado após o QA

- projeto Supabase Hárpia ativo;
- usuários temporários de QA removidos;
- CRM revision = `0`;
- Inbox revision = `0`;
- sem dados fictícios operacionais;
- build/typecheck consolidado ainda não confirmado pela Frente01.

## NÃO VERIFICADO ainda

- `npm run build` consolidado;
- TypeScript completo da árvore integrada;
- login real pelo navegador;
- comportamento visual de `crm.view` e `inbox.view` em sessão real;
- CRUD + refresh pela UI autenticada;
- conflito real entre duas sessões;
- conversão pública → fila sem etapa → classificação pela UI;
- dashboard refletindo alteração CRM real;
- Inbox ↔ SalesBot/IA/Automatize ponta a ponta;
- continuidade de execução após reload completo;
- WhatsApp real;
- teste final pelo usuário.

## Critério de fechamento

A Frente04 só muda para 🟢 quando build/typecheck integrado estiver válido, a UI autenticada estiver executável e os fluxos principais puderem ser testados ponta a ponta pelo usuário.
