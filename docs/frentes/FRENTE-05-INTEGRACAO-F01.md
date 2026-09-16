# Frente05 ↔ Frente01 — estado atual da integração

Data: 16/09/2026
Origem: Frente05
Destino: Frente01

## Estado atual

A Frente01 já incorporou a Frente05 atual e declarou a integração estrutural liberada para continuidade das demais frentes.

Confirmado na branch `frente-01`:

- rotas/sidebar de SalesBot, Automatize, Agentes IA, Execuções e Integrações;
- RBAC corrigido: rotas aceitam `view OR manage`;
- `canManage` é passado explicitamente aos workspaces F05;
- hidratação e Realtime do estado compartilhado F05;
- storage F05 em Supabase com revisão/optimistic locking;
- CRM ↔ Automatize;
- Inbox ↔ SalesBot/IA;
- SalesBot composto com CRM, IA, condições e webhook;
- cofre `ai-credential-vault` + Supabase Vault;
- runtime IA `ai-model-invoke`;
- tipos Supabase regenerados com o schema integrado;
- worker server-side de automações com CRM/webhook e hardening de SSRF.

A comparação entre as branches confirmou que a F01 contém os commits da F05 até o hardening de contexto de retomada do SalesBot.

## Núcleo F05 validado nesta rodada

O runtime de SalesBot agora persiste somente o contexto operacional necessário enquanto a execução está aberta/pausada.

Verificações executadas em harness isolado com o código atual:

- `start()` persiste contexto inicial + `leadId` + `conversationId`;
- pausa por `delay` mantém o contexto;
- recriação do command port não perde o contexto da execução;
- `resume()` mescla contexto anterior + contexto novo, preservando IDs canônicos;
- conclusão remove `runtimeContext` do log;
- encadeamento A → B mantém o mesmo contexto operacional;
- resultados: `F05_CONTEXT_RESUME_TEST_OK` e `F05_CHAIN_CONTEXT_TEST_OK`.

## RBAC

O desvio anterior está RESOLVIDO na F01.

Hoje:

- SalesBot aceita `salesbot.view` ou `salesbot.manage` na rota;
- Automatize aceita `automations.view` ou `automations.manage`;
- Agentes IA aceita `ai.view` ou `ai.manage`;
- Integrações aceita `integrations.view` ou `integrations.manage`;
- workspaces recebem `canManage={hasPermission(...manage)}` explicitamente;
- F05 continua default-deny quando a prop/acesso não é informado.

## Persistência compartilhada

Também está sincronizada entre F01 e F05:

- `configureF05SharedStorage(...)`;
- `replaceStoredListFromRemote(...)`;
- rollback por geração;
- escrita confirmada para mutações críticas;
- refresh remoto invalida rollback atrasado;
- listeners de UI em SalesBot, Automatize, Agentes, Integrações e Execuções.

## Segurança

Confirmado no backend real durante o QA:

- estado F05 sem dados operacionais fictícios;
- `anon` sem acesso à tabela compartilhada;
- RLS aplicado;
- escrita compartilhada por `SECURITY INVOKER` + RLS;
- Vault não expõe chave bruta ao browser;
- worker server-side bloqueia HTTPS inválido, redes privadas/localhost, CGNAT e redirects externos;
- Security Advisor já havia sido validado com 0 lints após a convergência de hardening.

## Lacuna funcional ainda observada no worker server-side

O `automation-event-worker` executa atualmente:

- ações CRM: conectado;
- webhook: conectado;
- `start_salesbot`: ainda retorna `not_configured`;
- `invoke_ai`: ainda retorna `not_configured`.

Isso afeta automações disparadas pelo outbox server-side (por exemplo, lead criado pela entrada pública) quando a definição tenta iniciar SalesBot ou IA. O caminho interno/browser continua com SalesBot/IA compostos no `PlatformRuntime`.

Não tratar esse ponto como concluído até a integração server-side ser ligada ou até a primeira entrega declarar explicitamente que essas duas ações ficam fora do fluxo server-side inicial.

## Usuários temporários de QA

Autorização do responsável já concedida para:

1. admin interno temporário;
2. viewer interno temporário com permissões `*.view` da F05 e sem `*.manage`.

Última conferência real no Supabase nesta rodada:

- `auth.users = 0`;
- usuários internos ativos = 0.

A sessão F05 não possui caminho seguro para criar Auth; não foi feito insert direto em `auth.users`.

## Pendências reais agora

1. Criar os dois usuários temporários de QA por um caminho oficial do Supabase Auth.
2. Executar E2E autenticado de `view/manage`, RLS, storage compartilhado e cofre pela UI.
3. Executar build/typecheck do produto consolidado quando houver ambiente Node/npm compatível.
4. Decidir/ligar `start_salesbot` e `invoke_ai` no worker server-side se essas ações fizerem parte da primeira entrega do outbox.
5. Chamada real a provedor de IA exige credencial real cadastrada pelo administrador.
6. WhatsApp e Meta reais continuam para a fase final.

## Situação da Frente05

A F05 não está mais aguardando sincronização de branch nem correção de RBAC da F01. O núcleo pode continuar sendo testado e endurecido. O verde final integrado continua condicionado aos usuários de QA/build/E2E e à definição do runtime server-side das ações SalesBot/IA.
