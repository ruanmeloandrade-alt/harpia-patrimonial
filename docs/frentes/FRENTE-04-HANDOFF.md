# Handoff — Frente04 CRM/Inbox

Data-base: 17/09/2026
Branch: `frente-04`

## Status

- 🟠 CRM/Kanban/Lead 360 — implementação e integração estrutural concluídas; backend RBAC já validado; falta somente execução de build/typecheck e E2E visual em ambiente executável.
- 🟠 Inbox — implementação e integração estrutural concluídas; seleção explícita de SalesBot/agente agora é preservada por conversa e também durante remount causado por realtime; falta build/typecheck e E2E visual.
- 🟢 RBAC backend CRM/Inbox — `view/manage`, leitura RLS, bloqueio de escrita e diretório de responsáveis validados com identidades temporárias autenticadas e removidas após o QA.
- 🟠 Persistência multiusuário — usa infraestrutura oficial da Frente01 com Supabase, optimistic locking e realtime; falha de persistência é exibida na UI; conflito visual entre duas sessões continua NÃO VERIFICADO.
- 🟠 Site→CRM / Dashboard / F05 — contratos e composição integrados; E2E visual/autenticado continua NÃO VERIFICADO.

Nenhum item foi marcado como 🟢 apenas porque o código existe.

## Sincronização com a Frente01

A Frente04 foi reposicionada sobre o head final informado da Frente01:

- base Frente01: `bd6dbbc50dfe35841d6ca4ba6c930e6bc5d16cf5`;
- commit funcional de sync F04: `030116fb7ac6a864e28f8330889c009a6b009b77`;
- a branch `frente-04` está 0 commits atrás da Frente01;
- o delta funcional de código da Frente04 sobre essa base é somente `src/features/inbox/InboxWorkspaceCore.tsx`;
- CRM e os demais arquivos da Inbox estão alinhados com a árvore final da Frente01.

O histórico divergente antigo não é mais usado como base de trabalho.

## Delta funcional novo da Inbox

A Inbox passou a preservar a seleção de automação por conversa:

- SalesBot selecionado é memorizado por `conversationId`;
- agente IA selecionado é memorizado por `conversationId`;
- alternar entre conversas não apaga a escolha da outra conversa;
- remount causado por atualização realtime não apaga a seleção da sessão atual;
- a seleção continua explícita; nenhum bot/agente é escolhido automaticamente;
- o estado não é persistido como dado operacional no backend e não cria mock.

## CRM entregue

- funis configuráveis;
- etapas configuráveis, reordenação e exclusão protegida;
- Kanban e movimentação manual;
- Lead 360;
- responsável;
- tags;
- campos personalizados tipados;
- tarefas/próximas ações;
- histórico;
- eventos CRM;
- fila de leads sem etapa;
- conversões sem etapa permanecem visíveis;
- nenhuma etapa/default fictícia;
- realtime sem reset visual por eco do próprio save;
- falha de persistência compartilhada visível na UI;
- modo somente leitura por capacidade de gestão.

## Inbox entregue

- layout em três colunas;
- conversa + contexto CRM;
- sessão interna sem simular WhatsApp;
- envio bloqueado sem transporte real;
- recursos preparados para texto, áudio, imagem, vídeo, documento e formulário;
- alteração de responsável, etapa, tags, campos e tarefas pelo contexto da conversa;
- seleção explícita de SalesBot e agente IA;
- seleção preservada por conversa durante navegação/remount realtime;
- canal não pode ficar `connected` sem transporte real;
- dedupe de mensagem externa por conversa + ID externo;
- falhas de persistência CRM/Inbox visíveis na UI.

## RBAC fino da Inbox

`InboxWorkspace` mantém capacidades independentes:

- `canManageInbox`;
- `canManageCrm`;
- `canManageSalesBot`;
- `canManageAiAgent`;
- `canManage` apenas como atalho legado.

Status pode continuar legível sem liberar comando de gestão.

## QA backend já executado

Documento: `docs/frentes/FRENTE-04-RBAC-QA.md`.

Resultado preservado:

- administrador temporário recebeu permissões de leitura/gestão esperadas;
- usuário temporário somente leitura recebeu `*.view` e não recebeu `*.manage`;
- leitura de estado CRM/Inbox funcionou;
- tentativa de escrita sem permissão foi recusada;
- diretório de responsáveis funcionou;
- identidades/grupos temporários foram removidos;
- nenhum lead, conversa ou dado operacional fictício foi deixado.

## Integração Frente05

O adapter F04↔F05 continua responsável por:

- `botId`/`agentId` explícitos;
- preservar `executionId` durante recriações de runtime na mesma sessão;
- não retomar recurso diferente;
- evitar invocação duplicada de agente já em execução;
- não pausar execução encerrada;
- limpar ponteiros concluídos/falhos/not_found;
- expor ações CRM para Automatize;
- converter eventos CRM para o contrato F05.

## Persistência oficial

A fonte de verdade multiusuário permanece na infraestrutura da Frente01:

- `platform_module_state`;
- RLS;
- RPC de save;
- optimistic locking;
- merge de leads públicos;
- Supabase Realtime.

Não restaurar persistência paralela/local como fonte de verdade multiusuário.

## NÃO VERIFICADO neste ambiente

- `npm run build` com Node 24;
- `npm run typecheck` completo;
- login real pelo navegador;
- comportamento visual de `crm.view` e `inbox.view` em sessão real;
- CRUD + refresh pela UI autenticada;
- conflito real entre duas sessões;
- conversão pública → fila sem etapa → classificação pela UI;
- dashboard refletindo alteração CRM real;
- Inbox ↔ SalesBot/IA/Automatize ponta a ponta no navegador;
- continuidade de execução após reload completo;
- WhatsApp real;
- validação final pelo usuário.

## Handoff obrigatório

- Status: 🟠 funcionalmente implementado e sincronizado; validação executável final ainda pendente.
- Commit funcional: `030116fb7ac6a864e28f8330889c009a6b009b77`.
- O que foi entregue: CRM configurável, Lead 360, Inbox operacional, RBAC fino, persistência integrada, contratos F02/F03/F05 e preservação de seleção de automação por conversa.
- O que ficou pendente: build/typecheck e E2E visual/autenticado em ambiente executável.
- Modelo de dados CRM: funil, etapa, lead, tags, campos personalizados, tarefas, histórico e origem/contexto de conversão.
- Eventos emitidos: criação de lead, mudança de etapa, campo, tag e demais eventos extensíveis do contrato CRM.
- Contratos esperados da Frente05: comandos/status de SalesBot e IA e eventos para Automatize.
- Integrações esperadas com catálogo/site: contexto de imóvel/produto e ingestão de conversão sem mensagem automática.
- Riscos conhecidos: somente os itens marcados como NÃO VERIFICADO acima; não há dependência estrutural pendente da Frente01.
- Instruções para integração: usar `frente-04` atual; não recuperar o histórico divergente anterior; preservar o delta de `InboxWorkspaceCore.tsx` ao integrar.
