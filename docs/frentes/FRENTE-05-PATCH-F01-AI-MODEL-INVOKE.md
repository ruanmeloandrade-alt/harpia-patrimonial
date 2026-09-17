# Frente05 → Frente01 — patch de runtime IA/server-side

Data: 17/09/2026

Este handoff substitui o patch antigo limitado ao `ai-model-invoke`.

## Estado atual

A F05 já possui:

- `f05-runtime-worker` ACTIVE;
- `f05-delay-worker` ACTIVE;
- scheduler durável `f05-delay-resume-30s` ativo;
- provider adapters com SSRF hardening;
- Vault para credenciais IA;
- `start_salesbot` e `invoke_ai` server-side.

O `automation-event-worker` da F01 ainda precisa encaminhar essas duas ações ao runtime F05.

## Contrato

Endpoint interno:

`POST /functions/v1/f05-runtime-worker`

Header obrigatório:

`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

A chamada com bearer inválido foi testada e retorna `401`.

### `invoke_ai`

```json
{
  "action": "invoke_ai",
  "agentId": "<agent-id>",
  "context": {}
}
```

### `start_salesbot`

```json
{
  "action": "start_salesbot",
  "botId": "<bot-id>",
  "leadId": "<lead-id opcional>",
  "conversationId": "<conversation-id opcional>",
  "context": {}
}
```

## Segurança já implementada

- service role nunca vai ao browser;
- HTTPS obrigatório para endpoints externos;
- credenciais embutidas na URL bloqueadas;
- localhost e `.local` bloqueados;
- IPv4 privadas/link-local/documentation/reserved bloqueadas;
- CGNAT `100.64.0.0/10` bloqueado;
- IPv6 local/privado/documentation bloqueado;
- DNS é resolvido no backend e endereços privados são rejeitados;
- redirect manual;
- timeout explícito;
- credencial IA sai do Vault somente no backend.

## Regra para a F01

Ao integrar `automation-event-worker`:

- não duplicar runtime de SalesBot/IA na F01;
- usar `f05-runtime-worker` como executor dessas ações;
- preservar idempotência de `automation_action_runs`;
- parar a sequência em `rejected` ou `not_configured`;
- manter metadados canônicos (`eventId`, `eventType`, `leadId`, `conversationId`) protegidos de sobrescrita pelo payload;
- não transformar falha em sucesso.

## Validação disponível

Além dos testes isolados, a F05 validou em backend real:

- scheduler retomando delay vencido até `completed`;
- `f05-delay-worker → f05-runtime-worker → SalesBot filho` com pai e filho `completed`;
- token inválido do scheduler retornando `401`;
- bearer inválido do runtime retornando `401`;
- fixtures temporários removidos após testes.
