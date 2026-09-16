# Frente04 — QA de integração atual

Data-base: 16/09/2026
Branch proprietária: `frente-04`

## Semáforo

- 🟠 CRM/Kanban/Lead 360 — código F04 implementado e runtime compartilhado F01 já disponível; falta correção da montagem da fila de leads sem etapa e teste final no produto.
- 🟠 Inbox — runtime compartilhado F01 + adapter F04↔F05 já montados; seleção explícita de SalesBot/IA existe na composição integrada; falta build/E2E e teste pelo usuário.
- 🟠 Site → CRM — Frente02 já está ligada ao `public-lead-ingest` da Frente01 e retorna `automaticMessageSent: false`; falta ensaio ponta a ponta sem inserir dado fictício.
- 🟠 Dashboard CRM — Frente01 já fornece `CrmSnapshotMetricsProvider` usando o mesmo repository compartilhado; falta validação visual integrada.
- 🟠 Persistência — Supabase dedicado ativo, `platform_module_state` aplicado e repositories compartilhados montados; falta sessão real de usuário para validar RLS/escrita pela UI.
- 🟠 SalesBot/IA/Automatize — runtime real da Frente05 já está composto com CRM actions/event sink na Frente01; falta execução ponta a ponta com recurso real configurado.
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

### 1. Lead sem etapa pode ficar invisível no CRM integrado

A composição atual da Frente01 monta `CrmWorkspace` diretamente. Conversões públicas são criadas sem obrigação de estágio/funil. Portanto um lead pode existir no banco e não aparecer em nenhuma coluna do Kanban.

A Frente04 já possui `UnassignedLeadsQueue` e `Front04CrmScreen`, que mantêm esses leads visíveis e permitem classificá-los.

Correção de integração aceita:

1. preferencial: montar `Front04CrmScreen` no `IntegratedCrm`; ou
2. incorporar a fila de leads sem etapa dentro do `CrmWorkspace` canônico antes do merge final.

Não criar etapa fictícia nem mover automaticamente o lead para uma etapa inventada.

### 2. Fonte de recursos SalesBot/IA deve permanecer explícita

A composição integrada da Frente01 atualmente lista recursos da Frente05 diretamente na Inbox. A branch canônica F04 aceita `salesBots` e `aiAgents` por props para evitar acoplamento interno F04→F05.

No merge final, preservar seleção explícita por conversa e não escolher bot/agente automaticamente.

### 3. Avisos de segurança foram rechecados no banco real

O Security Advisor ainda exibe avisos históricos sobre RPCs, porém a definição atual do banco foi conferida diretamente:

- `save_f05_shared_storage` está executável somente por `authenticated`, não por `anon`, e a definição atual é `SECURITY INVOKER`;
- `save_platform_module_state` está executável somente por `authenticated`, também `SECURITY INVOKER`, e valida `private.can_write_platform_module(...)`;
- `list_internal_assignees` continua `SECURITY DEFINER`, executável somente por `authenticated`, e filtra acesso por `private.user_has_permission(...)`.

Portanto o aviso `anon` observado anteriormente não representa o grant atual do banco. A Frente04 não vai alterar grants dessas funções; o integrador/F01-F05 ainda deve manter a revisão de segurança antes do verde final.

## Critério restante para fechar F04

A Frente04 pode seguir para verde quando:

1. leads sem etapa estiverem visíveis na rota integrada;
2. build/typecheck conjunto passar;
3. uma sessão interna real validar leitura/escrita CRM e Inbox com RLS;
4. site → CRM for validado ponta a ponta sem mensagem automática;
5. dashboard refletir mudança real de CRM;
6. Inbox operar mudança de CRM e comando SalesBot/IA com recurso real configurado;
7. nenhum envio externo for simulado enquanto WhatsApp não estiver conectado;
8. usuário conseguir abrir e testar as rotas relevantes.
