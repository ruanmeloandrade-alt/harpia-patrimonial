# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`

## Status visual

- 🟠 CRM/Kanban/Lead 360 — implementação própria fechada e endurecida; runtime compartilhado/realtime já existem na Frente01; falta sync final, build/E2E e teste pelo usuário.
- 🟠 Inbox — implementação própria fechada; seleção explícita de SalesBot/IA, realtime visual e invariantes de transporte tratados; falta sync final, build/E2E e teste pelo usuário.
- 🟠 Entrada automática de leads — backend público seguro já existe na Frente01; falta ensaio ponta a ponta real até a fila sem etapa.
- 🟠 Dashboard CRM — integração usa a mesma fonte CRM compartilhada; falta validação visual com dado real.
- 🟠 SalesBot/IA/Automatize — adapters implementados e runtime real já composto na Frente01; falta execução ponta a ponta com recurso real configurado.
- 🟠 Persistência multiusuário — infraestrutura oficial da Frente01 com Supabase, optimistic locking e realtime; persistência paralela da Frente04 foi removida.
- 🔴 Build/typecheck consolidado — ainda não verificado.
- 🔴 Validação final pelo usuário — ainda não executada.

Nenhum item recebe 🟢 apenas porque o código existe.

## Implementado pela Frente04

### CRM

- domínio de funil, etapa, lead, tag, campo personalizado, tarefa, histórico e eventos;
- CRUD e ativação/desativação de funis;
- CRUD, reordenação e exclusão protegida de etapas;
- Kanban configurável e movimentação manual;
- Lead 360 com contato, origem, página, ação, interesse, referência e observações;
- responsável por usuário interno;
- tags;
- campos personalizados tipados;
- tarefas/próximas ações;
- histórico;
- eventos CRM para automação;
- fila de leads sem etapa;
- classificação da fila somente para etapas de funis ativos;
- entrada canônica `CrmWorkspace` inclui automaticamente a fila sem etapa;
- realtime remonta a UI somente quando o snapshot realmente mudou, evitando reset por eco do próprio save local.

Arquitetura canônica:

- `CrmWorkspace.tsx`: wrapper de integração/realtime;
- `CrmWorkspaceCore.tsx`: implementação visual;
- `service.ts`: camada canônica com hardening;
- `serviceCore.ts`: CRUD/base original preservado.

### Hardening de campos personalizados

`CrmService` agora protege UI e ações do Automatize:

- `select`/`multiselect` exigem opções reais;
- opções são limpas e deduplicadas;
- campo inativo rejeita alteração;
- número precisa ser finito;
- boolean exige boolean;
- select aceita somente opção declarada;
- multiselect aceita somente lista de opções declaradas;
- valor incompatível é recusado antes de persistir.

### Conversões públicas

`ingestLeadConversion` preserva nome/e-mail/WhatsApp, origem, página, ação, interesse/referência, `occurredAt` e `metadata`.

Regra mantida: criar lead não envia mensagem automaticamente (`automaticMessageSent: false`).

A Frente01 já implementou o backend seguro `public-lead-ingest` e a composição pública da Frente02 já utiliza esse caminho.

### Inbox

- layout de três colunas;
- lista de conversas;
- chat central;
- contexto CRM à direita;
- sessão interna sem fingir canal conectado;
- contratos para texto, áudio, imagem, vídeo, documento e formulário;
- envio bloqueado sem transporte real;
- alteração de etapa entre funis ativos;
- responsável;
- tags;
- campos personalizados tipados;
- tarefas;
- horário/contexto de conversão;
- seleção explícita de SalesBot;
- seleção explícita de agente IA;
- nenhuma escolha automática de fluxo;
- realtime troca services/port sem reset visual quando os snapshots continuam equivalentes;
- mudança real de CRM/Inbox remonta o core para não exibir snapshot antigo;
- canal não pode ser marcado como conectado sem transporte real;
- desconectar remove `externalThreadId`;
- mensagens externas são deduplicadas por `conversationId + externalMessageId`.

Arquitetura canônica:

- `InboxWorkspace.tsx`: wrapper de integração/realtime;
- `InboxWorkspaceCore.tsx`: implementação visual;
- `service.ts`: invariantes de conversa/transporte/mensagem.

### Integração Frente05

O contrato público continua em `src/features/crm/front05Adapter.ts`; a implementação-base anterior foi preservada em `front05AdapterCore.ts`.

O adapter atual:

- aceita `botId`/`agentId` explícitos;
- preserva execução por lead/conversa;
- mantém `executionId` em escopo de módulo para sobreviver à recriação do `automationPort` pela Frente01 durante a mesma sessão;
- só retoma SalesBot pausado quando o bot selecionado é o mesmo;
- não apresenta status de execução antiga para outro recurso;
- evita invocação duplicada de IA quando o mesmo agente já está rodando;
- não tenta pausar execução já encerrada;
- limpa ponteiros de execução concluída, falha ou `not_found`;
- ações do Automatize operam o `CrmService` real;
- eventos CRM são convertidos para o contrato F05.

A Inbox da Frente04 não importa repositories internos da Frente05. Ela recebe `automationPort`, `salesBots` e `aiAgents` por props.

## Persistência e realtime oficiais

A fonte operacional oficial é a infraestrutura da Frente01:

- `platform_module_state` para CRM/Inbox;
- RLS;
- RPC de save;
- optimistic locking por revisão;
- merge seguro de conversões públicas;
- Supabase Realtime para recarregar CRM/Inbox entre sessões.

A implementação paralela `src/features/crm/sharedStatePersistence.ts` foi removida da Frente04 para impedir duas rotas de persistência.

A F04 agora consome services/repositories injetados pela composição integradora, mantendo fallback local apenas para uso isolado do módulo.

## QA de backend observado

No projeto Supabase dedicado da Hárpia:

- Security Advisor atual: `0` lints;
- Performance Advisor: somente INFO de índices ainda não utilizados;
- última consulta: `auth.users = 0`;
- última consulta: usuários internos ativos = `0`;
- linhas compartilhadas de estado `crm` e `inbox` existem.

Sem usuário real ainda não é possível concluir E2E autenticado/RLS/UI.

## Integração Frente01 observada

Já existem:

- `/interno/crm`;
- `/interno/inbox`;
- CRM/Inbox compartilhados;
- realtime entre sessões;
- responsáveis internos vindos do backend;
- métricas CRM no dashboard;
- CRM events ligados ao Automatize;
- runtime de SalesBot e IA reais;
- estado F05 compartilhado.

Atenção no merge: preservar as versões atuais da Frente04 de `CrmWorkspace`, `InboxWorkspace`, `service` e `front05Adapter` junto com seus respectivos arquivos `*Core`, porque a branch Frente01 ainda foi observada com versões anteriores desses módulos.

## Pontos externos ainda pendentes

1. **RBAC de leitura no shell**
   - a montagem observada da Frente01 ainda exige `crm.manage` para `/interno/crm` e `inbox.manage` para `/interno/inbox`;
   - perfis com somente `crm.view`/`inbox.view` ainda não conseguem entrar;
   - correção pertence à Frente01/integrador.

2. **Primeiro usuário real**
   - sem administrador interno real não há como concluir E2E autenticado/RLS/UI.

3. **Build/typecheck conjunto**
   - ainda não executado em ambiente consolidado com as cinco frentes.

4. **Recursos reais F05**
   - ainda é necessário configurar SalesBot/agente reais para testar start/pause/resume/status ponta a ponta.

5. **WhatsApp/Meta**
   - continuam não conectados; nenhuma UI da Frente04 deve fingir envio.

## Arquivos principais a preservar no merge

- `src/features/crm/domain.ts`
- `src/features/crm/repository.ts`
- `src/features/crm/service.ts`
- `src/features/crm/serviceCore.ts`
- `src/features/crm/contracts.ts`
- `src/features/crm/front01Adapter.ts`
- `src/features/crm/front05Adapter.ts`
- `src/features/crm/front05AdapterCore.ts`
- `src/features/crm/CrmWorkspace.tsx`
- `src/features/crm/CrmWorkspaceCore.tsx`
- `src/features/crm/UnassignedLeadsQueue.tsx`
- `src/features/crm/Front04Workspace.tsx`
- `src/features/crm/crm.module.css`
- `src/features/inbox/domain.ts`
- `src/features/inbox/repository.ts`
- `src/features/inbox/service.ts`
- `src/features/inbox/InboxWorkspace.tsx`
- `src/features/inbox/InboxWorkspaceCore.tsx`
- `src/features/inbox/inbox.module.css`

## Validações executadas nesta frente

- revisão estrutural de CRM/Inbox;
- checagens TypeScript isoladas dos wrappers/hardenings recentes;
- checagens isoladas do adapter F04↔F05;
- proteção de exclusão de etapa com leads;
- bloqueio de envio sem transporte real;
- bloqueio de falso estado `connected` sem transporte;
- empty states sem dados fictícios;
- validação de tipos de campos personalizados;
- revisão de CSS modular sem seletor global vazando;
- revisão do runtime realtime da Frente01;
- Security Advisor do backend rechecado com zero lints.

## NÃO VERIFICADO ainda

- `npm run build` consolidado;
- TypeScript completo das cinco frentes juntas;
- primeiro login administrativo real;
- RBAC real de CRM/Inbox;
- CRUD + refresh pela UI com sessão real;
- concorrência real entre duas sessões autenticadas;
- conversão pública → fila sem etapa → classificação;
- dashboard refletindo alteração real de CRM;
- Inbox ↔ SalesBot/IA/Automatize ponta a ponta;
- continuidade de execução de automação após reload completo da página;
- WhatsApp real;
- teste final pelo usuário.

## Critério de fechamento

A Frente04 só muda para 🟢 quando build/typecheck integrado, RBAC, persistência/realtime, conversão, CRM, Inbox e integrações relevantes estiverem realmente testáveis pelo usuário.
