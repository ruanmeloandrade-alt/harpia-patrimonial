# Handoff — Frente04 CRM/Inbox

Data-base: 17/09/2026
Branch: `frente-04`

## Status final da frente

- 🟢 CRM/Kanban/Lead 360 — implementação concluída.
- 🟢 Inbox operacional — implementação concluída.
- 🟢 RBAC backend CRM/Inbox — validado com RLS real.
- 🟢 Persistência multiusuário — Supabase + optimistic locking + Realtime integrados.
- 🟢 CRM ↔ Automatize — confirmação de persistência antes de evento/aceite implementada.
- 🟢 Typecheck — aprovado com Node 24 no GitHub Actions.
- 🟢 Build — aprovado com Node 24 no GitHub Actions.
- 🟠 E2E visual/autenticado em navegador — ainda não executado nesta frente.
- 🔴 WhatsApp/Meta reais — continuam fora do escopo desta fase, conforme briefing.

## Validação executável

Workflow: `.github/workflows/f04-check.yml`

Execução validada em 17/09/2026:

- Node `24.20.0`;
- instalação de dependências: sucesso;
- `npm run typecheck`: sucesso;
- `npm run build`: sucesso.

O primeiro CI detectou três erros de tipagem reais. Foram corrigidos antes da aprovação final:

- cleanup de canais Supabase no `PlatformRuntime`;
- tipagem JSON de `organization_settings.preferences`;
- após os ajustes, typecheck e build passaram integralmente.

## Backend real validado

Projeto Supabase: `Harpia Patrimonial`.

Confirmado nesta rodada:

- `platform_module_state` possui módulos `crm` e `inbox`;
- ambos usam estado JSON e revisionamento;
- RLS está ativo com policies separadas de leitura e escrita;
- `save_platform_module_state` usa optimistic locking por `expected_revision`;
- RPC não é executável por `anon`;
- tabela não é legível por `anon`;
- `platform_module_state` participa do `supabase_realtime`;
- security advisors: sem lints;
- nenhum dado operacional fictício foi criado nesta rodada.

O QA transacional anterior continua documentado em `docs/frentes/FRENTE-04-RBAC-QA.md` e validou:

- `crm.view/manage`;
- `inbox.view/manage`;
- bloqueio de escrita para viewer;
- optimistic locking CRM/Inbox;
- diretório de responsáveis;
- conversão pública → CRM → outbox;
- leitura F05 por domínio;
- limpeza completa dos dados temporários.

## CRM entregue

- criação, edição, ativação e desativação de funis;
- etapas configuráveis;
- reordenação e exclusão protegida;
- Kanban e movimentação manual;
- Lead 360;
- nome, e-mail, WhatsApp, origem e contexto de interesse;
- responsável;
- tags;
- campos personalizados tipados;
- observações;
- tarefas e próximas ações;
- histórico;
- fila de leads sem etapa;
- eventos CRM extensíveis;
- modo somente leitura por permissão;
- persistência compartilhada e Realtime.

## Inbox entregue

- layout em três colunas;
- lista de conversas;
- chat central;
- contexto CRM lateral;
- alteração de etapa, responsável, tags, campos e tarefas pelo contexto da conversa;
- suporte estrutural a texto, áudio, imagem, vídeo, documento e formulário;
- envio real bloqueado enquanto não houver transporte conectado;
- canal não pode ser marcado como conectado sem transporte real;
- dedupe de mensagem externa por conversa + ID externo;
- comandos de SalesBot/IA com permissões independentes;
- seleção explícita de SalesBot e agente IA;
- seleção preservada por conversa durante navegação/remount realtime.

## CRM ↔ Automatize

A atomicidade foi fechada por instância do repositório CRM:

- o repositório expõe `waitForLastSave()`;
- o runtime injeta essa barreira no adapter da Frente05;
- eventos CRM→Automatize aguardam a persistência remota;
- ações Automatize→CRM só retornam `accepted` após save confirmado;
- conflito/falha de persistência impede avanço falso da automação;
- repository local/síncrono continua resolvendo imediatamente.

Arquivos principais:

- `src/features/crm/repository.ts`;
- `src/app/integrations/sharedStateRepositories.ts`;
- `src/features/crm/front05Adapter.ts`;
- `src/app/PlatformRuntime.tsx`;
- `src/features/inbox/InboxWorkspaceCore.tsx`.

## Dependências

A Frente01 necessária à F04 está integrada. Não há bloqueio estrutural pendente da Frente01 para o CRM/Inbox.

Os contratos atuais com a Frente05 continuam compatíveis com `SalesBotCommandPort`, `AIAgentCommandPort` e `CrmActionPort`.

## Ainda não verificado

- login real pelo navegador;
- comportamento visual completo de perfil viewer/admin;
- CRUD + refresh pela UI autenticada;
- conflito visual entre duas sessões simultâneas;
- fluxo Inbox ↔ SalesBot/IA/Automatize ponta a ponta no navegador;
- continuidade visual após reload completo;
- validação visual final pelo usuário.

Esses itens são QA de integração/navegador; não existe mais pendência de implementação ou compilação própria da Frente04.

## Handoff obrigatório

- Status: 🟢 implementação da Frente04 concluída; 🟠 E2E visual final pendente.
- Código validado no CI: `b3224bb4d9f2a8e5bd8c50e4472d18156fe0168c`.
- O que foi entregue: CRM configurável, Lead 360, Inbox operacional, RBAC fino, persistência multiusuário, Realtime, integração F02/F03/F05, preservação de seleção de automação por conversa e atomicidade CRM↔Automatize.
- O que ficou pendente: somente QA visual/autenticado de integração e canais externos reservados para fase posterior.
- Modelo CRM: funil, etapa, lead, tags, campos personalizados, tarefas, histórico e contexto de origem/interesse.
- Eventos: criação de lead, mudança de etapa, campo, tag e eventos extensíveis, entregues à automação após persistência confirmada.
- Instrução de integração: usar a branch `frente-04` atual e preservar os deltas listados acima.
