# Frente05 ↔ Frente01 — estado atual da integração

Data: 16/09/2026
Origem: Frente05
Destino: Frente01

## Estado atual

A integração estrutural F01 ↔ F05 avançou e não está mais no estágio de “montar rotas do zero”.

Já confirmado na branch `frente-01`:

- rotas internas de SalesBot, Automatize, Agentes IA, Execuções e Integrações;
- links correspondentes no `InternalShell`;
- permissões `salesbot.*`, `automations.*`, `ai.*` e `integrations.*`;
- backend Supabase ativo;
- cofre IA `ai-credential-vault` com Supabase Vault;
- estado compartilhado da Frente05 em `public.f05_shared_storage`;
- hidratação do estado F05 antes de renderizar os módulos;
- CRM conectado ao `processCrmAutomationEvent`;
- Inbox conectada aos command ports de SalesBot e IA;
- SalesBot composto com ações CRM, agente IA, avaliador de condição e webhook;
- runtime IA seguro server-side composto no `PlatformRuntime`.

## Contratos canônicos da Frente05

A API pública permanece em `src/features/automations/index.ts`.

Os workspaces da F05 também suportam permissão granular de edição:

- `SalesBotWorkspace canManage={...}`;
- `AutomationsWorkspace canManage={...}`;
- `AIAgentsWorkspace canManage={...}`;
- `ExecutionLogsPanel canManage={...}`;
- `IntegrationsWorkspace canManage={...}`.

O `Front05Workspace` já faz esse mapeamento quando usado de forma consolidada.

## Persistência compartilhada

A Frente05 suporta oficialmente dois modos:

1. standalone/isolado: fallback local para desenvolvimento e testes da branch;
2. produto integrado: `configureF05SharedStorage(...)` substitui o armazenamento local por backend compartilhado.

Na integração atual da Frente01, o backend compartilhado é Supabase com optimistic locking por revisão.

Depois da hidratação compartilhada, `localStorage` não é mais fonte de verdade da F05.

Hardening adicional feito pela F05 nesta rodada:

- escrita compartilhada é otimista na UI;
- se o backend rejeitar a escrita por RLS/conflito/revisão, a F05 desfaz a alteração em memória;
- rollback atrasado nunca apaga uma edição posterior, pois cada chave possui geração de escrita;
- workspaces SalesBot, Automatize, Agentes IA, Provedores/Integrações e Execuções escutam hidratação, confirmação e rollback do storage compartilhado.

## Cofre de credenciais IA

O caminho canônico é o implementado/consolidado pela Frente01:

- Edge Function: `ai-credential-vault`;
- tabela privada de referência: `private.ai_credential_refs`;
- segredo bruto: Supabase Vault;
- RPCs server-side: `admin_store_ai_credential`, `admin_delete_ai_credential`, `admin_resolve_ai_credential`;
- UI F05 usa `createSupabaseAICredentialVault(...)` / `AICredentialVaultPort`;
- nenhuma chave API é persistida em localStorage, código ou documentação.

O caminho antigo `ai-credentials` não é mais o caminho canônico do código F05.

## Runtime IA canônico

O runtime canônico integrado é:

- Edge Function: `ai-model-invoke`;
- adapter F05: `createSupabaseAIModelRuntime(...)`;
- composição: `createAIAgentCommandPort(createSupabaseAIModelRuntime(...))`.

O executor server-side:

- recebe `profileId`, instruções/input/contexto;
- carrega o perfil canônico em `f05_shared_storage`;
- resolve a credencial no Vault somente no servidor;
- executa OpenAI/Codex, Anthropic/Claude, Google Gemini ou provedor customizado;
- nunca devolve a chave ao browser.

## Hardening do estado compartilhado F05

Estado canônico atual do banco e da fonte da Frente01:

- `anon` não possui `EXECUTE` em `save_f05_shared_storage`;
- o RPC público `save_f05_shared_storage` é `SECURITY INVOKER`;
- escrita usa `UPDATE` protegido por RLS;
- policy `f05_shared_storage_update` valida `private.can_write_f05_storage(storage_key)` em `USING` e `WITH CHECK`;
- `authenticated` possui somente os grants necessários de `select/update` na tabela e `execute` no RPC;
- Security Advisor do projeto ficou em 0 lints após a convergência de hardening.

A branch F05 não deve restaurar o writer privado intermediário criado durante o QA; o desenho final é RLS + `SECURITY INVOKER`.

## Bloqueio RBAC encontrado no QA integrado

A branch `frente-01` ainda precisa corrigir o encaixe de leitura/edição da F05 antes do verde final.

### AppRouter

Hoje SalesBot, Automatize, Agentes IA e Integrações exigem apenas `*.manage`. Isso impede usuário que possui somente `*.view` de abrir a tela em modo leitura.

Correção esperada: permitir acesso quando existir `view` **ou** `manage` do módulo, mantendo edição condicionada ao `manage`.

Exemplos:

- SalesBot: `[salesbot.view, salesbot.manage]`;
- Automatize: `[automations.view, automations.manage]`;
- Agentes IA: `[ai.view, ai.manage]`;
- Integrações: `[integrations.view, integrations.manage]`.

### IntegratedInternalModules

Os workspaces são montados hoje sem `canManage`, portanto o integrador deve passar explicitamente:

```tsx
<SalesBotWorkspace canManage={auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE)} />
<AutomationsWorkspace canManage={auth.hasPermission(PERMISSIONS.AUTOMATIONS_MANAGE)} />
<AIAgentsWorkspace canManage={auth.hasPermission(PERMISSIONS.AI_MANAGE)} />
<ExecutionLogsPanel canManage={
  auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE)
  || auth.hasPermission(PERMISSIONS.AI_MANAGE)
} />
<IntegrationsWorkspace
  credentialVault={runtime.credentialVault}
  canManage={auth.hasPermission(PERMISSIONS.INTEGRATIONS_MANAGE)}
/>
```

A F05 já endureceu `ExecutionLogsPanel` para `canManage=false` por padrão. Assim um usuário que só possui `view` não consegue limpar logs mesmo se o integrador esquecer a prop.

## Pendências reais para a Frente01

1. Sincronizar os commits recentes da branch `frente-05`, incluindo rollback de persistência e listeners de UI.
2. Corrigir RBAC integrado conforme seção acima: rota aceita `view/manage`; edição recebe `canManage` explicitamente.
3. Manter `ai-model-invoke` como executor IA canônico.
4. Executar build/typecheck do produto consolidado quando o ambiente Node/npm estiver disponível.
5. Com um administrador interno real, executar E2E de permissões e salvar/remover chave pela UI.

## O que não depende mais da Frente01

A Frente05 não está mais aguardando desenho de shell, definição de permissões, criação do cofre ou definição do runtime IA. Esses contratos já estão estabelecidos.

## O que ainda impede o “verde final integrado”

- branch consolidada ainda precisa conter os últimos commits F05;
- RBAC `view/manage` ainda precisa ser aplicado no shell integrador;
- build/typecheck conjunto ainda não foi registrado como aprovado;
- E2E autenticado com usuário real ainda não foi executado;
- chamada real a provedor exige uma chave real configurada pelo administrador;
- WhatsApp e Meta reais continuam deliberadamente fora desta fase.
