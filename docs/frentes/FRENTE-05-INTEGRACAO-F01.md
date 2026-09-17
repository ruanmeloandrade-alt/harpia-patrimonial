# Frente05 → Frente01 — handoff de integração

Data: 17/09/2026
Origem: `frente-05`
Destino: `frente-01`

## Estado atual

A integração estrutural F01↔F05 já existia, mas a branch F05 avançou novamente e contém componentes ainda não absorvidos pela F01.

A comparação deve ser refeita pela F01 no momento da integração porque ambas as branches continuam avançando em paralelo.

PR #1 permanece como handoff oficial. Não fazer merge forçado nem substituir arquivos globais da F01 sem reconciliação.

## O que a F05 entrega pronto

### Front/runtime

- SalesBot CRUD + blocos + validações;
- pausa/retomada com contexto persistido;
- lease de retomada concorrente;
- Automatize;
- agentes IA;
- provedores IA;
- storage compartilhado;
- integridade de referências;
- SSRF hardening;
- API consolidada em `src/features/automations/index.ts`.

### Runtime server-side

Edge Function:

- `f05-runtime-worker` — ACTIVE.

Ações aceitas:

- `start_salesbot`;
- `invoke_ai`.

Contrato HTTP interno:

- método: `POST`;
- endpoint: `/functions/v1/f05-runtime-worker`;
- autenticação: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`;
- acesso externo sem service role é rejeitado com `401`.

Payload `start_salesbot`:

```json
{
  "action": "start_salesbot",
  "botId": "<id>",
  "leadId": "<opcional>",
  "conversationId": "<opcional>",
  "context": {}
}
```

Payload `invoke_ai`:

```json
{
  "action": "invoke_ai",
  "agentId": "<id>",
  "context": {}
}
```

Resposta usa o contrato `accepted | rejected | not_configured`.

### Delay durável

Edge Function:

- `f05-delay-worker` — ACTIVE.

Infra:

- `pg_cron`;
- `pg_net`;
- Supabase Vault;
- job `f05-delay-resume-30s` a cada 30 segundos;
- lease/claim para evitar retomada concorrente.

Foi testado no backend real com fixture temporário e limpeza completa ao final.

Também foi validado o caminho:

`f05-delay-worker → f05-runtime-worker → SalesBot filho`

Pai e filho terminaram `completed`.

## Mudança mínima necessária no `automation-event-worker` da F01

O worker atual ainda retorna `not_configured` para `start_salesbot` e `invoke_ai`.

Na F01, essas duas ações devem ser encaminhadas para `f05-runtime-worker` usando a service role já disponível server-side.

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

Para `start_salesbot`:

```ts
result = await callF05Runtime('start_salesbot', {
  botId: action.config?.botId,
  leadId: event.lead_id,
  conversationId: event.conversation_id,
  context: event.payload ?? {},
});
```

Para `invoke_ai`:

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

Regras obrigatórias ao absorver:

- manter idempotência de `automation_action_runs`;
- não marcar como `accepted` se o runtime retornar `rejected` ou `not_configured`;
- não expor service role ao browser;
- manter `redirect: 'manual'` e timeout;
- preservar IDs canônicos do evento acima de payload arbitrário;
- não ligar WhatsApp/Meta falsamente.

## Arquivos F05 a considerar

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

## Validações já executadas

- runtime SalesBot isolado;
- contexto após pausa;
- chain flow;
- referência/ciclos;
- storage/optimistic locking;
- cofre/Vault;
- provider adapters;
- SSRF hardening;
- runtime server-side implantado;
- runtime bloqueia bearer inválido com `401`;
- scheduler durável real;
- token inválido do scheduler retorna `401`;
- cron ativo com execuções `succeeded`;
- delay vencido retomado e concluído;
- delay-worker chamando runtime-worker e executando bot encadeado;
- fixtures removidos após testes;
- Security Advisor sem lints na última conferência.

## Dependências fora da F05

- primeiro admin QA pelo fluxo oficial da F01/Auth;
- E2E autenticado admin/viewer;
- build/typecheck consolidado;
- chamada IA com chave real;
- WhatsApp real;
- Meta real.

A F05 não cria bypass de Auth nem insere diretamente em `auth.users`.
