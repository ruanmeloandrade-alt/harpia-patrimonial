# Frente05 → Frente01 — handoff de integração

Data: 17/09/2026
Origem: `frente-05`
Destino: `frente-01`

## Estado atual

A integração estrutural F01↔F05 já existia, mas a branch F05 avançou novamente e contém componentes ainda não absorvidos pela F01.

Há dois caminhos de integração:

- **PR #1** — handoff amplo da branch `frente-05`; branches divergidas, exige reconciliação cuidadosa;
- **PR #3** — patch mínimo do `automation-event-worker`, criado diretamente sobre a F01 atual. Última conferência: 1 commit à frente, 0 atrás, 1 arquivo, `mergeable=true`.

Para remover imediatamente os `not_configured` de `start_salesbot` e `invoke_ai`, o **PR #3 é o caminho preferencial**. Não fazer merge forçado do PR #1.

## Entrega F05 pronta

- SalesBot CRUD + blocos + validações;
- pausa/retomada com contexto persistido;
- lease de retomada concorrente;
- Automatize;
- agentes/provedores IA;
- storage compartilhado;
- integridade de referências;
- SSRF hardening;
- `f05-runtime-worker` ACTIVE;
- `f05-delay-worker` ACTIVE;
- scheduler `f05-delay-resume-30s` ativo;
- `start_salesbot` server-side;
- `invoke_ai` server-side.

## Contrato do runtime server-side

Endpoint:

`POST /functions/v1/f05-runtime-worker`

Autenticação:

`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Resposta:

`accepted | rejected | not_configured`

### start_salesbot

```json
{
  "action": "start_salesbot",
  "botId": "<id>",
  "leadId": "<opcional>",
  "conversationId": "<opcional>",
  "context": {}
}
```

### invoke_ai

```json
{
  "action": "invoke_ai",
  "agentId": "<id>",
  "context": {}
}
```

## PR #3 — patch isolado já preparado

Branch: `f05-f01-worker-integration`.

Commit: `[F05→F01] worker: encaminhar SalesBot e IA ao runtime F05`.

Arquivo único alterado:

- `supabase/functions/automation-event-worker/index.ts`.

O patch:

- adiciona helper interno `callF05Runtime`;
- encaminha `start_salesbot` ao runtime F05;
- encaminha `invoke_ai` ao runtime F05;
- valida `botId` e `agentId` antes da chamada;
- usa a service role somente server-side;
- mantém timeout de 45 s;
- mantém `redirect: manual`;
- preserva `accepted | rejected | not_configured`;
- rejeita payload inesperado do runtime;
- preserva idempotência de `automation_action_runs`;
- mantém sequência interrompida em qualquer resultado diferente de `accepted`;
- corrige precedência dos metadados canônicos no matcher;
- corrige precedência dos metadados canônicos no payload de webhook.

O diff completo do PR #3 foi revisado após a criação e não carrega mudanças de outras frentes.

## Delay durável validado

- `pg_cron` + `pg_net` ativos;
- token dedicado no Vault;
- RPC de validação restrito a service role/postgres;
- token inválido retorna `401`;
- cron com execuções `succeeded`;
- delay vencido retomado até `completed`;
- teste real `delay-worker → runtime-worker → SalesBot filho` concluído;
- fixtures removidos e coleções operacionais voltaram a zero itens.

## Arquivos F05 relevantes para a integração ampla

- `src/features/automations/engine.ts`;
- `src/features/automations/index.ts`;
- `src/features/automations/outboundUrlValidation.ts`;
- `src/features/automations/runtimePorts.ts`;
- `src/features/integrations/providerAdapters.ts`;
- `src/features/salesbot/delayScheduler.ts`;
- `src/features/salesbot/executionRepository.ts`;
- `src/features/salesbot/runtime.ts`;
- `src/features/salesbot/types.ts`;
- `src/features/salesbot/validation.ts`;
- `supabase/functions/f05-runtime-worker/**`;
- `supabase/functions/f05-delay-worker/**`;
- `supabase/schema/f05_durable_delay_scheduler.sql`.

## Dependências ainda externas à F05

- F01 absorver PR #3 e implantar o worker oficial atualizado;
- primeiro admin QA via fluxo oficial da F01/Auth;
- E2E autenticado admin/viewer;
- build/typecheck consolidado;
- chamada IA com chave real;
- WhatsApp/Meta reais.

A F05 não cria bypass de Auth nem insere diretamente em `auth.users`.
