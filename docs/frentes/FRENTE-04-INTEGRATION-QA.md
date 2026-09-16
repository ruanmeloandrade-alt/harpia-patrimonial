# Frente04 — QA de integração atual

Data-base: 16/09/2026
Branch proprietária: `frente-04`

## Semáforo

- 🟠 CRM/Kanban/Lead 360 — código F04 implementado, fila de leads sem etapa incorporada ao `CrmWorkspace` canônico e runtime compartilhado F01 já disponível; falta sincronizar esse delta no integrador e testar no produto.
- 🟠 Inbox — runtime compartilhado F01 + adapter F04↔F05 já montados; seleção explícita de SalesBot/IA existe na branch F04; falta sincronização final, build/E2E e teste pelo usuário.
- 🟠 Site → CRM — Frente02 já está ligada ao `public-lead-ingest` da Frente01 e retorna `automaticMessageSent: false`; falta ensaio ponta a ponta com usuário/ambiente real.
- 🟠 Dashboard CRM — Frente01 já fornece `CrmSnapshotMetricsProvider` usando o mesmo repository compartilhado; falta validação visual integrada.
- 🟠 Persistência — Supabase dedicado ativo, `platform_module_state` aplicado e repositories compartilhados montados; falta sessão real de usuário para validar RLS/escrita pela UI.
- 🟠 SalesBot/IA/Automatize — runtime real da Frente05 já está composto com CRM actions/event sink na Frente01; falta sincronizar o adapter mais novo da F04 e executar ponta a ponta com recurso real configurado.
- 🔴 Teste final pelo usuário — ainda depende de administrador real, configuração de ambiente/deploy, build/typecheck conjunto e QA E2E.

Nenhum bloco recebe 🟢 apenas por estar montado em código.

## Dependências que já foram liberadas

### Frente01

Confirmado na composição atual:

- `/interno/crm` existe;
- `/interno/inbox` existe;
- CRM/Inbox usam estado compartilhado Supabase;
- responsáveis internos são carregados do backend;
- métricas comerciais usam o mesmo repository CRM;
- `Front05CrmEventSink` está inscrito nos eventos do `CrmService`;
- runtime de SalesBot recebe o CRM real;
- runtime de IA usa o adapter seguro de modelo;
- estado da Frente05 é hidratado do backend compartilhado.

### Frente02

Confirmado:

- `IntegratedPublicExperience` fornece `crmIngest` real;
- ingestão passa pela Edge Function `public-lead-ingest`;
- contexto de conversão é preservado;
- criação de lead não envia mensagem automaticamente.

### Frente03

Confirmado:

- dashboard recebe `CrmSnapshotMetricsProvider` ligado ao mesmo repository operacional;
- catálogo real também está disponível na mesma composição.

### Frente05

Confirmado:

- contratos de `SalesBotCommandPort`, `AIAgentCommandPort`, `CrmActionPort` e eventos continuam compatíveis;
- runtime expõe start/pause/resume/status;
- Frente01 já compõe CRM actions + IA + SalesBot + Automatize.

## Estado real do backend conferido

Consulta read-only no projeto Supabase dedicado confirmou:

- `crm`: revision `0`, `0` leads;
- `inbox`: revision `0`, `0` conversas;
- `0` usuários internos ativos;
- `0` usuários em `auth.users`.

Isso confirma que o ambiente continua sem dado fictício e também explica por que o E2E autenticado ainda não pode ser concluído.

## Desvios encontrados no QA

### 1. Lead sem etapa — corrigido na branch F04, pendente de sincronização

A composição observada na Frente01 monta `CrmWorkspace` diretamente. A Frente04 tornou esse mesmo caminho seguro: `CrmWorkspace.tsx` agora é a entrada canônica e incorpora `UnassignedLeadsQueue`, enquanto a UI anterior foi preservada em `CrmWorkspaceCore.tsx`.

Com isso:

- conversões sem `stageId` permanecem visíveis;
- nenhum estágio fictício é criado;
- o lead só pode ser classificado em etapa de funil ativo;
- `Front04CrmScreen` não duplica a fila.

Validação isolada de TypeScript do wrapper + fila: OK.

O integrador precisa sincronizar juntos:

- `src/features/crm/CrmWorkspace.tsx`;
- `src/features/crm/CrmWorkspaceCore.tsx`;
- `src/features/crm/UnassignedLeadsQueue.tsx`.

### 2. Fonte de recursos SalesBot/IA deve permanecer explícita

A composição integrada observada na Frente01 ainda lista recursos da Frente05 diretamente dentro da Inbox.

A branch canônica F04 recebe `salesBots` e `aiAgents` por props. No merge final, preservar essa separação para que CRM/Inbox não dependa do repository interno da Frente05.

A seleção continua explícita por conversa; nenhum bot/agente deve ser escolhido automaticamente.

### 3. Adapter F04↔F05 da Frente01 está atrás da branch F04

Preservar a versão atual da Frente04 de `src/features/crm/front05Adapter.ts`.

Ela evita:

- retomar execução pausada de um SalesBot diferente do selecionado;
- mostrar status de uma execução antiga para outro `botId`/`agentId`;
- disparar novamente o mesmo agente IA quando ele já está em execução.

### 4. Avisos de segurança foram rechecados no banco real

O Security Advisor ainda exibe avisos históricos sobre RPCs, porém a definição atual do banco foi conferida diretamente:

- `save_f05_shared_storage` está executável somente por `authenticated`, não por `anon`, e a definição atual é `SECURITY INVOKER`;
- `save_platform_module_state` está executável somente por `authenticated`, também `SECURITY INVOKER`, e valida `private.can_write_platform_module(...)`;
- `list_internal_assignees` continua `SECURITY DEFINER`, executável somente por `authenticated`, e filtra acesso por `private.user_has_permission(...)`.

Portanto o aviso `anon` observado anteriormente não representa o grant atual do banco. A Frente04 não altera grants dessas funções; o integrador/F01-F05 mantém a revisão de segurança antes do verde final.

## Delta mínimo de sync

Consultar `docs/frentes/FRENTE-04-SYNC-DELTA.md` antes do merge final.

## Critério restante para fechar F04

A Frente04 pode seguir para verde quando:

1. os deltas atuais da branch F04 estiverem sincronizados no integrador;
2. build/typecheck conjunto passar;
3. uma sessão interna real validar leitura/escrita CRM e Inbox com RLS;
4. site → CRM for validado ponta a ponta sem mensagem automática;
5. dashboard refletir mudança real de CRM;
6. Inbox operar mudança de CRM e comando SalesBot/IA com recurso real configurado;
7. nenhum envio externo for simulado enquanto WhatsApp não estiver conectado;
8. usuário conseguir abrir e testar as rotas relevantes.
