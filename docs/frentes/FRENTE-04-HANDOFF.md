# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`

## Status visual

- 🟠 CRM/Kanban/Lead 360 — implementação própria concluída; runtime compartilhado já existe na Frente01; falta QA integrado.
- 🟠 Inbox — implementação própria concluída; seleção explícita de SalesBot/IA alinhada; falta composição final e QA.
- 🟠 Entrada automática de leads — backend público seguro já existe na Frente01; falta testar ponta a ponta até a fila sem etapa.
- 🟠 Dashboard CRM — runtime integrado já usa o mesmo repository CRM no provider comercial; falta teste com dados reais.
- 🟠 SalesBot/IA/Automatize — adapters implementados; falta execução ponta a ponta com recursos reais.
- 🟠 Persistência multiusuário — `platform_module_state` + revisão otimista já estão aplicados no Supabase da Hárpia pela Frente01; falta QA de concorrência e feedback de erro.
- 🔴 Build/typecheck das cinco frentes juntas — ainda não verificado.
- 🔴 Validação final pelo usuário — ainda não executada.

Nenhum item recebe 🟢 enquanto o usuário ainda não puder abrir e testar o fluxo integrado.

## Implementado pela Frente04

### CRM

- domínio de funil, etapa, lead, tag, campo personalizado, tarefa, histórico e eventos;
- criação, renomeação e ativação/desativação de funil;
- criação, renomeação, reordenação e exclusão protegida de etapa;
- Kanban configurável e movimentação manual;
- Lead 360 com edição de contato, origem, página, ação, interesse, referência e observações;
- responsável por usuário interno;
- tags;
- campos personalizados tipados;
- tarefas/próximas ações;
- histórico;
- fila de leads sem etapa (`UnassignedLeadsQueue`);
- eventos idempotentes nos pontos críticos;
- emissão `harpia:crm-updated` para consumidores como dashboard.

### Conversões públicas

`ingestLeadConversion` preserva:

- nome/e-mail/WhatsApp;
- origem;
- página;
- ação;
- interesse/referência;
- `occurredAt`;
- `metadata`.

Regra absoluta mantida: criar lead não envia mensagem automaticamente (`automaticMessageSent: false`).

A Frente01 já implementou o backend `public-lead-ingest` e a RPC segura para inserir a conversão no estado compartilhado sem liberar escrita anônima direta no CRM.

### Inbox

- layout de três colunas;
- lista de conversas;
- chat central;
- contexto CRM à direita;
- sessão interna sem fingir canal conectado;
- texto, áudio, imagem, vídeo, documento e formulário preparados em contrato;
- envio bloqueado sem transporte real;
- alteração de etapa entre funis ativos;
- responsável;
- tags;
- campos personalizados tipados;
- tarefas;
- horário de conversão;
- seleção explícita de SalesBot;
- seleção explícita de agente IA;
- nenhuma escolha automática de fluxo.

### Integração Frente01

A Frente01 evoluiu e agora já possui:

- `/interno/crm`;
- `/interno/inbox`;
- `PlatformRuntime` com CRM/Inbox compartilhados;
- usuários internos para assignee;
- provider comercial usando CRM compartilhado;
- backend Supabase dedicado ativo.

Ajuste ainda necessário no integrador: `/interno/crm` foi observado montando `CrmWorkspace` diretamente. Deve montar `Front04CrmScreen`, pois conversões novas entram sem `stageId` e precisam aparecer em `UnassignedLeadsQueue`.

### Integração Frente03

A composição integrada observada já usa `CrmRepositorySnapshotSource`/`CrmSnapshotMetricsProvider` com a fonte CRM compartilhada.

Falta validar com dados reais no dashboard.

### Integração Frente05

`src/features/crm/front05Adapter.ts` expõe:

- `createFront05InboxAutomationAdapter`;
- `createFront05CrmActionPort`;
- `Front05CrmEventSink`;
- `toFront05CrmAutomationEvent`.

O adapter atualizado:

- aceita `botId`/`agentId` explícitos;
- preserva execução por lead/conversa;
- retoma SalesBot pausado somente quando o bot selecionado é o mesmo;
- trocar o SalesBot não retoma execução de outro bot;
- status considera o recurso atualmente selecionado;
- IA já rodando com o mesmo agente não dispara invocação duplicada;
- ações do Automatize operam o `CrmService` real;
- eventos CRM são mapeados para a Frente05.

A Inbox não importa repositories internos da Frente05. Ela recebe somente:

- `automationPort`;
- `salesBots: Array<{ id, name }>`;
- `aiAgents: Array<{ id, name }>`.

Isso mantém a fronteira entre módulos limpa.

## Persistência compartilhada

A solução operacional adotada na integração é a infraestrutura da Frente01 baseada em `platform_module_state`, não um segundo schema paralelo da Frente04.

Por isso, o schema alternativo que havia sido preparado nesta branch foi removido para evitar duas fontes de verdade.

A persistência integrada possui:

- estado CRM compartilhado;
- estado Inbox compartilhado;
- RLS;
- controle de revisão;
- RPC de save com optimistic locking;
- merge específico para conversões públicas que adicionem leads enquanto outra sessão trabalha no CRM.

Ainda falta testar duas sessões concorrentes e confirmar feedback visual quando houver conflito real.

## Problemas de integração encontrados no pente-fino atual

1. **Lead real invisível se CRM montar apenas `CrmWorkspace`**
   - conversões públicas podem entrar sem etapa;
   - `CrmWorkspace` sozinho só apresenta leads dentro das colunas;
   - usar `Front04CrmScreen` resolve porque inclui a fila sem etapa.

2. **Seleção de automação não pode depender de import interno F04 → F05**
   - corrigido na Frente04 via props públicas de opções;
   - integrador deve injetar os recursos ativos.

3. **Status/retomada não pode usar execução de recurso diferente**
   - corrigido no adapter da Frente04.

## Arquivos principais

- `src/features/crm/domain.ts`
- `src/features/crm/repository.ts`
- `src/features/crm/service.ts`
- `src/features/crm/contracts.ts`
- `src/features/crm/front01Adapter.ts`
- `src/features/crm/front05Adapter.ts`
- `src/features/crm/sharedStatePersistence.ts`
- `src/features/crm/CrmWorkspace.tsx`
- `src/features/crm/UnassignedLeadsQueue.tsx`
- `src/features/crm/Front04Workspace.tsx`
- `src/features/crm/crm.module.css`
- `src/features/inbox/domain.ts`
- `src/features/inbox/repository.ts`
- `src/features/inbox/service.ts`
- `src/features/inbox/InboxWorkspace.tsx`
- `src/features/inbox/inbox.module.css`
- `docs/frentes/FRENTE-04-INTEGRACAO-F01-ATUAL.md`

## Validações já executadas

- revisão estrutural dos serviços CRM/Inbox;
- checagens TypeScript isoladas em etapas anteriores;
- testes isolados do adapter F04↔F05 em etapas anteriores;
- proteção de exclusão de etapa com leads;
- bloqueio de envio sem transporte real;
- empty states sem dados fictícios;
- compatibilidade estrutural com usuários da Frente01;
- compatibilidade com conversão da Frente02;
- compatibilidade com métricas da Frente03;
- compatibilidade dos ports da Frente05;
- revisão de CSS para não vazar globalmente;
- revisão atual da montagem real da Frente01.

## NÃO VERIFICADO ainda

- `npm run build` do produto consolidado;
- TypeScript completo das cinco frentes juntas;
- primeiro login administrativo real;
- RBAC real de CRM/Inbox;
- CRUD + refresh no estado compartilhado;
- conversão pública → lead → fila sem etapa → classificação;
- dashboard com métricas reais;
- Inbox ↔ SalesBot/IA/Automatize ponta a ponta;
- conflito simultâneo entre duas sessões;
- WhatsApp real;
- teste final pelo usuário.

## Dependências restantes

### Frente01 / integrador

1. Montar `Front04CrmScreen` no CRM integrado.
2. Manter a mesma instância compartilhada de `CrmService`.
3. Injetar opções reais de SalesBot/IA na Inbox.
4. Criar/promover primeiro administrador real.
5. Executar build/typecheck/QA integrado.

### Frente02 / integrador

- Exercitar conversão real pelo `public-lead-ingest` e confirmar o lead na fila sem etapa.

### Frente03 / integrador

- Exercitar dashboard com os mesmos dados CRM compartilhados.

### Frente05 / integrador

- Fornecer recursos ativos reais para seleção;
- executar start/pause/resume/status;
- validar eventos CRM→Automatize;
- validar ações Automatize→CRM.

## Critério de fechamento

A Frente04 só muda para 🟢 quando build/typecheck integrado, RBAC, persistência, conversão, CRM, Inbox e integrações relevantes estiverem realmente testáveis pelo usuário.
