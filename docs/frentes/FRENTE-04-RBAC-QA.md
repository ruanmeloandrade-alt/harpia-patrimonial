# Frente04 — QA real de RBAC CRM/Inbox

Data: 16/09/2026
Branch proprietária: `frente-04`
Backend validado: Supabase `Harpia Patrimonial` (`desxomqvtjaymwwxivwq`)

## Objetivo

Validar no backend real que a integração recém-adicionada pela Frente01 permite acesso de leitura a CRM/Inbox sem conceder mutação, preserva optimistic locking e mantém o fluxo conversão pública → CRM → automação sem deixar dados fictícios após o ensaio.

## Perfis temporários usados

Foram usados perfis temporários explicitamente destinados a QA:

- `QA Admin F04` — membro temporário do grupo de sistema `Administrador`;
- `QA Viewer F04` — membro de grupo temporário contendo apenas:
  - `crm.view`;
  - `inbox.view`;
  - `salesbot.view`;
  - `ai.view`.

Perfis adicionais foram criados apenas dentro de transações com `ROLLBACK` para testes de optimistic locking e leitura F05.

Nenhum lead, conversa, imóvel, tarefa ou outro dado operacional fictício ficou persistido.

## Resultado da matriz de permissões

### Administrador

Com `auth.uid()` simulado por JWT do role `authenticated`:

- `crm.view` → `true`;
- `crm.manage` → `true`;
- `inbox.view` → `true`;
- `inbox.manage` → `true`;
- `salesbot.view` → `true`;
- `salesbot.manage` → `true`;
- `ai.view` → `true`;
- `ai.manage` → `true`.

### Perfil somente leitura

Com `auth.uid()` simulado por JWT do role `authenticated`:

- `crm.view` → `true`;
- `crm.manage` → `false`;
- `inbox.view` → `true`;
- `inbox.manage` → `false`;
- `salesbot.view` → `true`;
- `salesbot.manage` → `false`;
- `ai.view` → `true`;
- `ai.manage` → `false`.

## RLS / persistência compartilhada

Com o perfil somente leitura:

- `platform_module_state.crm` pôde ser lido;
- `platform_module_state.inbox` pôde ser lido;
- ambas as revisões observadas continuavam em `0`;
- tentativa de chamar `save_platform_module_state` para CRM foi recusada com `not authorized to write module state`;
- portanto `*.view` não concede gravação por RPC.

## Optimistic locking real

Foram executados ensaios transacionais independentes para CRM e Inbox, sempre encerrados com `ROLLBACK`.

### CRM

- usuário interno temporário com grupo `Administrador` criado dentro da transação;
- primeiro `save_platform_module_state('crm', ..., expected_revision=0)` foi aceito;
- segundo save com a mesma revisão antiga foi recusado retornando conflito (`null`);
- após `ROLLBACK`: usuário temporário restante `0` e CRM revision voltou a `0`.

### Inbox

- mesmo ensaio executado para `inbox`;
- primeiro save aceito;
- segundo save com revisão obsoleta recusado;
- após `ROLLBACK`: usuário temporário restante `0` e Inbox revision voltou a `0`.

Conclusão: o mecanismo de optimistic locking efetivamente rejeita uma segunda gravação baseada em snapshot velho.

## Conversão pública → CRM → outbox

Foi executado um ensaio transacional da RPC `admin_ingest_public_lead`, com contexto `service_role`, seguido de `ROLLBACK`.

Dentro da transação foi confirmado:

- a RPC retornou um `leadId` real;
- o lead apareceu exatamente uma vez em `platform_module_state.crm.state.leads`;
- CRM revision avançou de `0` para `1`;
- foi criado exatamente um evento `lead.created` em `automation_event_outbox` para o mesmo lead.

Após `ROLLBACK`:

- CRM revision = `0`;
- CRM leads = `0`;
- eventos QA no outbox = `0`.

Isso valida o caminho backend que sustenta Frente02 → Frente04 → Frente05 sem persistir mock operacional.

## Diretório de responsáveis

`public.list_internal_assignees()` funcionou para o perfil somente leitura e retornou os perfis internos temporários durante o ensaio, validando que Inbox/CRM conseguem carregar opções reais de responsáveis sem exigir `*.manage`.

## Leitura F05 pela Inbox

Foi validada a policy `f05_shared_storage_select`.

Para perfil com `salesbot.view`, `ai.view` e `inbox.view`, sem permissões de gestão:

- são legíveis as chaves relacionadas a SalesBot e IA;
- chaves de `automations` e `integrations` permanecem ocultas sem suas permissões próprias;
- `salesbot.manage` e `ai.manage` continuam `false`.

A visibilidade parcial observada (`5` das `7` chaves atuais) é esperada pelo desenho das policies, e não vazamento/bloqueio indevido.

## Limpeza

Ao final do QA foram removidos ou revertidos:

- usuários temporários de Auth;
- respectivos perfis;
- memberships temporárias;
- grupos temporários;
- permissões dos grupos temporários;
- alterações transacionais de CRM/Inbox;
- lead/evento de conversão usados no ensaio transacional.

Validação pós-limpeza:

- usuários QA persistentes restantes: `0`;
- grupos QA persistentes restantes: `0`;
- revisão CRM: `0`;
- revisão Inbox: `0`;
- leads CRM: `0`;
- eventos QA de conversão: `0`.

Nenhum dado operacional ficou persistido.

## Conclusão

🟢 Backend RBAC CRM/Inbox — matriz `view/manage` validada com identidades autenticadas temporárias e RLS real.

🟢 Leitura compartilhada — perfil `*.view` consegue ler CRM/Inbox.

🟢 Bloqueio de escrita — perfil somente leitura não consegue gravar via `save_platform_module_state`.

🟢 Optimistic locking CRM/Inbox — gravação stale recusada em ambos os módulos.

🟢 Conversão pública backend — lead + `lead.created` no outbox validados dentro de transação reversível.

🟢 Diretório de responsáveis — leitura autenticada validada.

🟢 Leitura F05 necessária à Inbox — policies por domínio validadas.

🟠 UI integrada — código já recebe `canManage`/capacidades granulares, mas ainda falta execução real em navegador/build consolidado.

🔴 E2E visual final — ainda depende de ambiente executável/build e sessão de navegador autenticada.
