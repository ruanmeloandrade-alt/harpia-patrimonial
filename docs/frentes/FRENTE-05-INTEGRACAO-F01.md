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
- SalesBot composto com ações CRM e agente IA;
- runtime IA seguro server-side composto no `PlatformRuntime`.

## Contratos canônicos da Frente05

A API pública permanece em:

```ts
import {
  buildFront05Access,
  configureF05SharedStorage,
  createAIAgentCommandPort,
  createSalesBotCommandPort,
  createSupabaseAICredentialVault,
  createSupabaseAIModelRuntime,
  processCrmAutomationEvent,
  resetF05SharedStorage,
  unconfiguredAutomationEngineDependencies,
  unconfiguredSalesBotRuntimeDependencies,
} from '../features/automations';
```

## Persistência compartilhada

A Frente05 agora suporta oficialmente dois modos:

1. standalone/isolado: fallback local para desenvolvimento e testes da branch;
2. produto integrado: `configureF05SharedStorage(...)` substitui o armazenamento local por backend compartilhado.

Na integração atual da Frente01, o backend compartilhado é Supabase com optimistic locking por revisão.

Depois da hidratação compartilhada, `localStorage` não é mais fonte de verdade da F05.

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

A função experimental `ai-provider-runtime` criada durante a integração não é mais o caminho canônico e foi removida da fonte da branch F05.

## Hardening do estado compartilhado F05

Aplicado no Supabase real:

- `anon` não possui `EXECUTE` em `save_f05_shared_storage`;
- o RPC público `save_f05_shared_storage` agora é `SECURITY INVOKER`;
- a escrita privilegiada ficou em função do schema privado;
- a função privada continua validando `private.can_write_f05_storage(storage_key)`;
- o alerta do Security Advisor referente ao RPC da Frente05 foi eliminado.

A migration correspondente está registrada em:

`supabase/schema/f05_shared_storage_hardening.sql`

## Pendências reais para a Frente01

1. Sincronizar os commits recentes da branch `frente-05` antes do QA final, especialmente RBAC somente-leitura, storage compartilhado oficial e adapters canônicos de cofre/runtime.
2. Manter `ai-model-invoke` como executor IA canônico.
3. Hardening recomendado para `ai-model-invoke`: adicionar timeout explícito de chamada ao provedor e bloquear também faixa IPv4 CGNAT `100.64.0.0/10` nos endpoints customizados.
4. Executar build/typecheck do produto consolidado quando o ambiente Node/npm estiver disponível.
5. Com um administrador interno real, executar E2E de permissões e salvar/remover chave pela UI.

## O que não depende mais da Frente01

A Frente05 não está mais aguardando desenho de shell, definição de permissões, criação do cofre ou definição do runtime IA. Esses contratos já estão estabelecidos.

## O que ainda impede o “verde final integrado”

- branch consolidada ainda precisa conter os últimos commits F05;
- build/typecheck conjunto ainda não foi registrado como aprovado;
- E2E autenticado com usuário real ainda não foi executado;
- chamada real a provedor exige uma chave real configurada pelo administrador;
- WhatsApp e Meta reais continuam deliberadamente fora desta fase.
