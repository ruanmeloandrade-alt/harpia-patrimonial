# Frente05 → Frente01 — handoff de integração

Data: 17/09/2026
Origem: `frente-05`
Destino: `frente-01`

## Estado atual

A integração estrutural F01↔F05 já existia, mas a branch F05 avançou novamente e contém componentes ainda não absorvidos pela F01.

As branches continuam avançando em paralelo. A comparação exata deve ser refeita pela F01 no momento da integração.

PR #1 permanece como handoff oficial. Não fazer merge forçado nem substituir arquivos globais da F01 sem reconciliação.

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

## Patch mínimo no automation-event-worker da F01

```ts
async function callF05Runtime(action: 'start_salesbot' | 'invoke_ai', payload: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/functions/v1/f05-runtime-worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverKey}`,
    },
    body: JSON.stringify({ action, ...payload }),
    redirect: 'manual',
    signal: AbortSignal.timeout(45000),
  });
  return await response.json();
}
```

`start_salesbot`:

```ts
result = await callF05Runtime('start_salesbot', {
  botId: action.config?.botId,
  leadId: event.lead_id,
  conversationId: event.conversation_id,
  context: event.payload ?? {},
});
```

`invoke_ai`:

```ts
result = await callF05Runtime('invoke_ai', {
  agentId: action.config?.agentId,
  context: {
    ...(event.payload ?? {}),
    eventId: event.id,
    eventType: event.event_type,
    leadId: event.lead_id,
    conversationId: event.conversation_id,
  },
});
```

Obrigatório:

- manter idempotência de `automation_action_runs`;
- parar sequência em `rejected` ou `not_configured`;
- não expor service role ao browser;
- manter redirect manual + timeout;
- preservar IDs canônicos acima do payload;
- não mascarar falhas.

## Delay durável validado

- `pg_cron` + `pg_net` ativos;
- token dedicado no Vault;
- RPC de validação restrito a service role/postgres;
- token inválido retorna `401`;
- cron com execuções `succeeded`;
- delay vencido retomado até `completed`;
- teste real `delay-worker → runtime-worker → SalesBot filho` concluído;
- fixtures removidos e coleções operacionais voltaram a zero itens.

## Arquivos F05 relevantes

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

- ligar o `automation-event-worker` F01 ao runtime F05;
- primeiro admin QA via fluxo oficial da F01/Auth;
- E2E autenticado admin/viewer;
- build/typecheck consolidado;
- chamada IA com chave real;
- WhatsApp/Meta reais.

A F05 não cria bypass de Auth nem insere diretamente em `auth.users`.
