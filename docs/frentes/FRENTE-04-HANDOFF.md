# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`

## Status visual

- 🟠 CRM/Kanban/Lead 360 — implementação própria fechada; runtime compartilhado e realtime já existem na Frente01; falta sync final, build/E2E e teste pelo usuário.
- 🟠 Inbox — implementação própria fechada; seleção explícita de SalesBot/IA e troca de runtime realtime tratadas; falta sync final, build/E2E e teste pelo usuário.
- 🟠 Entrada automática de leads — backend público seguro já existe na Frente01; falta ensaio ponta a ponta real até a fila sem etapa.
- 🟠 Dashboard CRM — integração usa a mesma fonte CRM compartilhada; falta validação visual com dado real.
- 🟠 SalesBot/IA/Automatize — adapters implementados e runtime real já composto na Frente01; falta execução ponta a ponta com recurso real configurado.
- 🟠 Persistência multiusuário — infraestrutura oficial da Frente01 com Supabase, optimistic locking e realtime; adapter paralelo da Frente04 foi removido.
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
- troca de `CrmService` em runtime realtime força atualização da tela sem manter snapshot antigo.

A implementação visual principal foi separada em `CrmWorkspaceCore.tsx`; `CrmWorkspace.tsx` é o wrapper canônico compatível com os imports já usados pela Frente01.

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
- troca de `CrmService`, `InboxService` ou `automationPort` em runtime realtime remonta o core para evitar snapshot/execução antiga.

A implementação visual principal da Inbox foi preservada em `InboxWorkspaceCore.tsx`; `InboxWorkspace.tsx` é o wrapper canônico e mantém o mesmo caminho de importação usado pela Frente01.

### Integração Frente05

`src/features/crm/front05Adapter.ts` expõe:

- `createFront05InboxAutomationAdapter`;
- `createFront05CrmActionPort`;
- `Front05CrmEventSink`;
- `toFront05CrmAutomationEvent`.

O adapter atual:

- aceita `botId`/`agentId` explícitos;
- preserva execução por lead/conversa;
- só retoma SalesBot pausado quando o bot selecionado é o mesmo;
- não apresenta status de execução antiga para outro recurso;
- evita invocação duplicada de IA quando o mesmo agente já está rodando;
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

A F04 agora somente consome services/repositories injetados pela composição integradora, mantendo fallback local apenas para uso isolado do módulo.

## QA de backend observado

No projeto Supabase dedicado da Hárpia:

- CRM e Inbox permanecem sem dados fictícios;
- Security Advisor atual: `0` lints;
- Performance Advisor: apenas INFO de índices ainda não utilizados, esperado no ambiente recém-criado/sem tráfego real.

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

Atenção no merge: preservar as versões atuais da Frente04 de `CrmWorkspace`, `InboxWorkspace` e `front05Adapter`, porque a branch Frente01 ainda foi observada com versões anteriores desses arquivos.

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
- `src/features/crm/contracts.ts`
- `src/features/crm/front01Adapter.ts`
- `src/features/crm/front05Adapter.ts`
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
- WhatsApp real;
- teste final pelo usuário.

## Critério de fechamento

A Frente04 só muda para 🟢 quando build/typecheck integrado, RBAC, persistência/realtime, conversão, CRM, Inbox e integrações relevantes estiverem realmente testáveis pelo usuário.
