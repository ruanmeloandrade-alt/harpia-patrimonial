# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`
Último commit de implementação relevante neste handoff: `2b12ad9108c7a96bb7d77b88e248ba13d82f8280`

## Status visual

- 🟠 CRM/Kanban/Lead 360: implementação própria concluída e adapters preparados; ainda sem rota/backend final montados.
- 🟠 Inbox: implementação própria concluída, com telas e automação desacopladas; ainda sem montagem final no shell.
- 🟠 Entrada automática de leads: contrato e persistência de contexto concluídos; integração real depende do merge com Frente02/Frente01.
- 🟠 SalesBot/IA/Automatize: adapters reais da Frente04 foram implementados e testados isoladamente; integração ponta a ponta depende do merge com Frente05 e IDs/configurações reais.
- 🔴 Validação final integrada pelo usuário: ainda indisponível até montagem das frentes e backend.

Nenhum item recebe 🟢 enquanto o usuário ainda não puder abrir e testar o fluxo integrado.

## Implementado pela Frente04

### CRM

- domínio de funil, etapa, lead, tag, campo personalizado, tarefa, histórico e eventos;
- persistência local transitória vazia por padrão, sem dados fictícios;
- criação, renomeação e ativação/desativação de funil;
- criação, renomeação, reordenação e exclusão protegida de etapa;
- Kanban configurável e movimentação manual;
- Lead 360 com edição de contato, origem, página, ação, interesse, referência e observações;
- associação de responsável por usuários internos;
- tags e campos personalizados;
- tarefas/próximas ações;
- histórico de alterações;
- fila de leads sem etapa;
- eventos idempotentes nos pontos críticos para evitar loops desnecessários de automação ao escrever o mesmo estágio, responsável, valor de campo ou status de tarefa;
- CSS do CRM restringido ao próprio workspace, evitando vazamento visual para outras frentes.

### Conversões Frente02 → CRM

`ingestLeadConversion` preserva:

- nome/e-mail/WhatsApp;
- origem;
- página;
- ação;
- interesse/referência;
- `occurredAt` em `sourceOccurredAt`;
- `metadata` em `sourceMetadata`.

Regra absoluta mantida: criar lead não envia mensagem automaticamente e retorna `automaticMessageSent: false`.

### Integração Frente01

Criado `src/features/crm/front01Adapter.ts`:

- `mapFront01Assignees(users)`;
- `loadFront01Assignees(listInternalUsers)`.

O adapter filtra somente usuários `internal` ativos e converte para `{ id, name }`.

A Frente04 também expõe entradas separadas:

- `Front04CrmScreen` — indicada para `/interno/crm` com `crm.view`;
- `Front04InboxScreen` — indicada para `/interno/inbox` com `inbox.view`;
- `Front04Workspace` — composição conjunta quando ambas as permissões forem garantidas.

As telas aceitam injeção de `CrmService`, `InboxService`, `CrmRepository`, `InboxRepository` e `CrmEventSink`, permitindo trocar a persistência local pelo backend real sem reescrever UI.

### Inbox

- layout de três colunas;
- lista de conversas;
- chat central;
- contexto CRM à direita;
- sessões internas sem fingir canal real;
- contratos para texto, áudio, imagem, vídeo, documento e formulário;
- bloqueio de envio sem transporte conectado;
- ingestão de mensagens recebidas por contrato;
- alteração de etapa, responsável, tags, campos e tarefas pela Inbox;
- fallback explícito quando automação ou transporte não estiverem configurados.

### Integração Frente05

Criado `src/features/crm/front05Adapter.ts` com:

- `createFront05InboxAutomationAdapter`;
- `createFront05CrmActionPort`;
- `Front05CrmEventSink`;
- `toFront05CrmAutomationEvent`.

O adapter:

- inicia SalesBot com `botId` real;
- preserva `executionId` por lead/conversa;
- pausa e retoma SalesBot usando o mesmo `executionId` quando aplicável;
- inicia/pausa IA por `agentId`/`executionId`;
- converte status runtime para o estado da Inbox;
- retorna indisponível quando não existe configuração real;
- converte ações do Automatize para o `CrmService` real;
- mapeia eventos CRM para o contrato atual da Frente05.

Mapeamento explícito:

- `lead.created` → `lead.created`;
- `lead.stage_changed` → `lead.stage_changed`;
- `lead.custom_field_changed` → `lead.field_changed`;
- `lead.tag_added` → `lead.tag_added`;
- `lead.tag_removed` → `lead.tag_removed`;
- `lead.inactivity_detected` → `lead.inactivity`;
- demais eventos → `custom.event` com `sourceEventType`.

## Arquivos principais

- `src/features/crm/domain.ts`
- `src/features/crm/repository.ts`
- `src/features/crm/service.ts`
- `src/features/crm/contracts.ts`
- `src/features/crm/front01Adapter.ts`
- `src/features/crm/front05Adapter.ts`
- `src/features/crm/CrmWorkspace.tsx`
- `src/features/crm/UnassignedLeadsQueue.tsx`
- `src/features/crm/Front04Workspace.tsx`
- `src/features/crm/crm.module.css`
- `src/features/inbox/domain.ts`
- `src/features/inbox/repository.ts`
- `src/features/inbox/service.ts`
- `src/features/inbox/InboxWorkspace.tsx`
- `src/features/inbox/inbox.module.css`

## Validações executadas

- revisão estrutural dos serviços CRM/Inbox;
- checagens TypeScript isoladas dos componentes principais realizadas em etapas anteriores;
- TypeScript isolado do adapter F04↔F05 atualizado: OK;
- teste comportamental do adapter F04↔F05 atualizado: OK para `botId` explícito, start, pause, resume, status e mapeamento de evento;
- proteção de exclusão de etapa com leads conferida;
- envio Inbox sem transporte real bloqueado;
- empty states e ausência de dados fictícios conferidos;
- compatibilidade estrutural com `listInternalUsers()` da Frente01 conferida;
- compatibilidade do adapter de conversão da Frente02 conferida;
- estilos do CRM revisados para não aplicar seletor global em inputs/selects/buttons.

## NÃO VERIFICADO ainda

- `npm run build` com as cinco frentes montadas;
- TypeScript completo do produto integrado;
- `/interno/crm` e `/interno/inbox` montados no router da Frente01;
- autorização backend/RLS para `crm.manage` e `inbox.manage`;
- persistência multiusuário real;
- evento real site → CRM no produto montado;
- integração com referências reais da Frente03;
- execução ponta a ponta de SalesBot/IA/Automatize com configurações reais;
- WhatsApp real;
- teste final pelo usuário.

## Dependências restantes

### Frente01 / integrador

1. Montar `Front04CrmScreen` e `Front04InboxScreen` nas rotas protegidas.
2. Carregar usuários com `listInternalUsers` e passar pelo adapter F04.
3. Injetar persistência backend real em `CrmRepository` e `InboxRepository`.
4. Aplicar autorização real de leitura/escrita conforme `crm.view`, `crm.manage`, `inbox.view`, `inbox.manage`.
5. O backend Supabase dedicado da Hárpia precisa estar disponível antes de validar persistência/RLS reais.

### Frente02 / integrador

- Montar `createFront04ConversionHandler` com `ingestLeadConversion` após merge e executar conversão real.

### Frente03 / integrador

- Fornecer referências reais de catálogo no interesse do lead e consumir métricas CRM no dashboard por contrato.

### Frente05 / integrador

1. Passar `salesBotCommandPort`/port criado pela F05 e `aiAgentCommandPort` ao `createFront05InboxAutomationAdapter`.
2. Resolver `botId` e `agentId` configurados para cada contexto; não escolher padrão fictício.
3. Ligar `Front05CrmEventSink` a `processCrmAutomationEvent`.
4. Passar `createFront05CrmActionPort(crmService)` como dependência CRM do engine da Frente05.
5. Exercitar start/pause/resume/status/eventos ponta a ponta após merge.

## Critério de fechamento

A Frente04 só muda para 🟢 quando as rotas estiverem montadas, persistência/RBAC reais estiverem ativos, build/typecheck integrados passarem e o usuário puder abrir/testar os fluxos relevantes.
