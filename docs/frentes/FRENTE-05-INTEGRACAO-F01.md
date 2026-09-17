# Frente05 ↔ Frente01 — estado atual da integração

Data: 17/09/2026
Origem: Frente05
Destino: Frente01

## Estado atual

A Frente01 já incorporou uma versão anterior da Frente05 e mantém a integração estrutural liberada. Desde então, a F05 avançou novamente e a comparação atual `frente-01...frente-05` mostra **26 commits da F05 fora da F01**.

O PR #1 continua aberto como canal de sincronização e não deve ser forçado se houver conflito com o trabalho paralelo da Frente01.

## Núcleo F05 disponível

- SalesBot CRUD + blocos + validação + runtime;
- pausa/retomada com contexto persistido;
- encadeamento entre bots com proteção contra ciclos;
- delays com `resumeAt`;
- lease temporário de retomada para evitar duas sessões retomando a mesma execução;
- Automatize com gatilhos, condições e ações sequenciais;
- agentes IA e perfis de provedores;
- cofre de credenciais via Supabase Vault;
- storage F05 compartilhado com optimistic locking e rollback;
- RBAC `view/manage` com default-deny;
- hardening de URL/webhook/provedores;
- API pública consolidada em `src/features/automations/index.ts`.

## Novo runtime server-side F05

Em 17/09/2026 foi criado na branch F05 e implantado no projeto Supabase o Edge Function interno:

`f05-runtime-worker`

Fonte:

- `supabase/functions/f05-runtime-worker/index.ts`
- `supabase/functions/f05-runtime-worker/config.toml`

O runtime implementa do lado F05:

- `start_salesbot` server-side;
- `invoke_ai` server-side;
- leitura do estado compartilhado real de bots, agentes e perfis;
- persistência de logs de execução com controle de `revision`;
- ações CRM via `admin_apply_crm_automation_action`;
- condição;
- delay;
- webhook/API;
- encadeamento de fluxo;
- agente IA;
- OpenAI/Codex;
- Anthropic/Claude;
- Google Gemini;
- provedor customizado;
- resolução da credencial somente no backend;
- proteção SSRF, redirect manual e timeout.

A função é interna: `verify_jwt=false` no gateway, mas o corpo exige `Authorization: Bearer <service/server key>`. Ela não aceita chamada anônima como autorização operacional.

Security Advisor após o deploy: 0 lints.

## Integração necessária na F01

O `automation-event-worker` atual da F01 ainda executa diretamente:

- ações CRM;
- webhook.

E ainda retorna `not_configured` para:

- `start_salesbot`;
- `invoke_ai`.

A lacuna do lado F05 deixou de ser ausência de runtime. Agora a mudança necessária é exclusivamente o encaminhamento dessas duas ações pelo worker da F01 para o `f05-runtime-worker`.

Contrato sugerido para a chamada interna:

### Iniciar SalesBot

```json
{
  "action": "start_salesbot",
  "botId": "<id do bot>",
  "leadId": "<id opcional>",
  "conversationId": "<id opcional>",
  "context": {}
}
```

### Chamar agente IA

```json
{
  "action": "invoke_ai",
  "agentId": "<id do agente>",
  "leadId": "<id opcional>",
  "conversationId": "<id opcional>",
  "context": {}
}
```

O retorno segue:

```ts
{
  status: 'accepted' | 'rejected' | 'not_configured';
  executionId?: string;
  reason?: string;
  data?: Record<string, unknown>;
}
```

A Frente05 não altera diretamente `automation-event-worker`, porque essa Edge Function permanece propriedade da F01.

## RBAC

O desvio anterior continua resolvido estruturalmente na F01:

- SalesBot: `view OR manage`;
- Automatize: `view OR manage`;
- Agentes IA: `view OR manage`;
- Integrações: `view OR manage`;
- edição recebe `canManage` explicitamente;
- F05 continua default-deny.

## Segurança

Confirmado anteriormente no backend real e preservado nesta rodada:

- estado F05 sem dados operacionais fictícios;
- RLS/default-deny no storage compartilhado;
- Vault sem chave bruta no browser;
- URLs externas validadas;
- CGNAT/localhost/redes privadas bloqueados;
- redirect externo não seguido automaticamente;
- timeout explícito em chamadas externas;
- Security Advisor atual: 0 lints.

## Usuários temporários de QA

Autorização do responsável já existe para:

1. admin interno temporário;
2. viewer interno temporário com permissões `*.view` da F05 e sem `*.manage`.

Conferência em 17/09/2026:

- `auth.users = 0`;
- `user_profiles` ativos = 0;
- a Edge Function temporária `f01-bootstrap-qa` está encerrada e retorna 410.

Portanto, a F05 continua sem caminho oficial próprio para criar usuários Auth sem invadir a responsabilidade da F01.

## Pendências reais agora

1. F01 absorver/sincronizar os commits atuais da F05.
2. F01 conectar `automation-event-worker` ao `f05-runtime-worker` para `start_salesbot` e `invoke_ai`.
3. F01/Auth disponibilizar admin QA + viewer QA por caminho oficial.
4. Executar E2E autenticado de `view/manage`, RLS, storage, Realtime e cofre.
5. Executar build/typecheck consolidado quando o ambiente integrado estiver disponível.
6. Chamada real a provedor IA exige credencial real cadastrada.
7. WhatsApp e Meta reais continuam fase final.

## Situação da Frente05

O runtime server-side necessário para SalesBot/IA agora existe do lado F05. A pendência server-side principal passou a ser integração no worker proprietário da F01, e não falta de implementação no escopo F05.
