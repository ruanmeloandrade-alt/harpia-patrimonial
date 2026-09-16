# Handoff — Frente04 CRM/Inbox

Data-base: 16/09/2026
Branch: `frente-04`
Último commit de implementação relevante neste handoff: `81d76447b0b65b8f6cd884a9f1b942f25bd6d07a`

## Status visual

- 🟠 CRM/Kanban/Lead 360 — implementação própria concluída e adapters preparados; ainda sem rota/backend final montados.
- 🟠 Inbox — implementação própria concluída; campos personalizados tipados e mudança entre funis também operáveis pela Inbox; ainda sem montagem final no shell.
- 🟠 Entrada automática de leads — contrato e contexto completos; integração real depende de backend seguro + montagem Frente02/Frente01.
- 🟠 Dashboard CRM — compatibilidade F04↔F03 preparada; falta composição no produto integrado.
- 🟠 SalesBot/IA/Automatize — adapters reais da Frente04 implementados e testados isoladamente; integração ponta a ponta depende de merge/configuração real da Frente05.
- 🟠 Banco/RLS — schema de produção preparado, mas ainda não aplicado/testado no Supabase dedicado da Hárpia.
- 🔴 Validação final pelo usuário — indisponível até montagem das frentes e backend.

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
- eventos idempotentes nos pontos críticos para evitar loops desnecessários ao escrever o mesmo estágio, responsável, valor de campo ou status de tarefa;
- `BrowserCrmRepository` emite `harpia:crm-updated` em `save`/`clear`, permitindo atualização reativa do dashboard da Frente03;
- CSS do CRM restrito ao próprio workspace.

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

`src/features/crm/front01Adapter.ts` expõe:

- `mapFront01Assignees(users)`;
- `loadFront01Assignees(listInternalUsers)`.

O adapter filtra somente usuários `internal` ativos e converte para `{ id, name }`.

Entradas separadas disponíveis:

- `Front04CrmScreen` — indicada para `/interno/crm` com `crm.view`;
- `Front04InboxScreen` — indicada para `/interno/inbox` com `inbox.view`;
- `Front04Workspace` — composição conjunta quando ambas as permissões forem garantidas.

As telas aceitam injeção de `CrmService`, `InboxService`, `CrmRepository`, `InboxRepository` e `CrmEventSink`.

A Frente01 atual já contém os arquivos da Frente04, shell, usuários e permissões, mas o `AppRouter` observado ainda não expõe `/interno/crm` nem `/interno/inbox`.

### Banco de produção preparado

Criado `src/features/crm/crm.schema.sql`, para aplicação **somente no projeto Supabase dedicado da Hárpia**, depois do `core_auth.sql` da Frente01.

Estrutura prevista:

- `crm_pipelines`;
- `crm_stages`;
- `crm_leads`;
- `crm_tags`;
- `crm_lead_tags`;
- `crm_custom_field_definitions`;
- `crm_lead_custom_field_values`;
- `crm_tasks`;
- `crm_lead_history`;
- `inbox_conversations`;
- `inbox_messages`.

O schema inclui:

- integridade etapa ↔ funil;
- índices operacionais;
- triggers de `updated_at`;
- RLS em todas as tabelas expostas;
- policies com `private.user_has_permission(...)`;
- grants explícitos para Data API;
- IDs CRM/Inbox `text` para compatibilidade com os IDs prefixados do domínio atual;
- `assignee_id` UUID ligado a `user_profiles`;
- zero acesso `anon` direto às tabelas CRM/Inbox;
- conversa criada pelo navegador sempre nasce `not_connected`;
- escrita real de mensagens fica no backend/service role, evitando mensagem marcada como enviada sem transporte real.

O schema foi somente preparado/revisado em código. **NÃO foi aplicado, executado ou aprovado por advisors**, pois a Frente04 não recebeu um projeto Supabase dedicado da Hárpia.

### Inbox

- layout de três colunas;
- lista de conversas;
- chat central;
- contexto CRM à direita;
- sessões internas sem fingir canal real;
- contratos para texto, áudio, imagem, vídeo, documento e formulário;
- bloqueio de envio sem transporte conectado;
- ingestão de mensagens recebidas por contrato;
- alteração de etapa entre qualquer funil ativo;
- responsável, tags, tarefas e campos personalizados pela Inbox;
- campos personalizados respeitam tipo `text`, `number`, `date`, `boolean`, `select`, `multiselect`;
- exibição do horário real de conversão quando presente;
- fallback explícito quando automação ou transporte não estiverem configurados.

### Integração Frente03

A Frente03 expõe `CrmRepositorySnapshotSource`, que escuta por padrão `harpia:crm-updated`.

A Frente04 já satisfaz esse contrato:

- `BrowserCrmRepository` dispara esse evento;
- `Front04Workspace` aceita repository/service compartilhado;
- o integrador pode fornecer a mesma fonte ao `CrmSnapshotMetricsProvider`, sem duplicar estado.

### Integração Frente05

`src/features/crm/front05Adapter.ts` expõe:

- `createFront05InboxAutomationAdapter`;
- `createFront05CrmActionPort`;
- `Front05CrmEventSink`;
- `toFront05CrmAutomationEvent`.

O adapter:

- inicia SalesBot com `botId` real;
- preserva `executionId` por lead/conversa;
- pausa e retoma SalesBot usando a mesma execução quando aplicável;
- inicia/pausa IA por `agentId`/`executionId`;
- converte status runtime para a Inbox;
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
- `src/features/crm/crm.schema.sql`
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
- TypeScript isolado do adapter F04↔F05: OK;
- teste comportamental do adapter F04↔F05: OK para `botId` explícito, start, pause, resume, status e mapeamento de evento;
- proteção de exclusão de etapa com leads conferida;
- idempotência de eventos CRM adicionada em estágio/responsável/campo/status de tarefa;
- envio Inbox sem transporte real bloqueado;
- empty states e ausência de dados fictícios conferidos;
- compatibilidade com `listInternalUsers()` da Frente01 conferida;
- compatibilidade do adapter de conversão da Frente02 conferida;
- compatibilidade do evento `harpia:crm-updated` com o adapter de dashboard da Frente03 conferida;
- compatibilidade dos ports atuais da Frente05 conferida;
- estilos CRM revisados para não vazar globalmente;
- schema SQL revisado estruturalmente contra os helpers/permissões existentes na Frente01 e alinhado aos IDs atuais do domínio.

## NÃO VERIFICADO ainda

- execução real de `crm.schema.sql`;
- advisors e testes RLS no Supabase dedicado;
- `npm run build` com as cinco frentes montadas;
- TypeScript completo do produto integrado;
- `/interno/crm` e `/interno/inbox` montados no router da Frente01;
- persistência multiusuário real;
- endpoint/Edge Function seguro para conversão pública;
- evento real site → CRM no produto montado;
- dashboard F03 lendo CRM no produto montado;
- execução ponta a ponta de SalesBot/IA/Automatize com configurações reais;
- WhatsApp real;
- teste final pelo usuário.

## Dependências restantes

### Frente01 / integrador

1. Montar `Front04CrmScreen` e `Front04InboxScreen` nas rotas protegidas.
2. Carregar usuários com `listInternalUsers` e passar pelo adapter F04.
3. Disponibilizar o Supabase dedicado da Hárpia.
4. Revisar/aplicar `crm.schema.sql`, executar advisors e validar RLS/grants.
5. Conectar persistência backend real em `CrmRepository`/`InboxRepository` ou adaptar a camada para I/O assíncrono no momento da integração, sem voltar a `localStorage` como persistência operacional.
6. Criar caminho backend/Edge Function seguro para conversões públicas, sem conceder INSERT `anon` direto em `crm_leads`.

### Frente02 / integrador

- Montar `createFront04ConversionHandler` com o endpoint/backend seguro que chama a ingestão CRM.

### Frente03 / integrador

- Compor a mesma fonte CRM no `CrmSnapshotMetricsProvider`; o contrato do lado F04 já está compatível.

### Frente05 / integrador

1. Passar ports SalesBot/IA reais ao `createFront05InboxAutomationAdapter`.
2. Resolver `botId` e `agentId` configurados para cada contexto.
3. Ligar `Front05CrmEventSink` a `processCrmAutomationEvent`.
4. Passar `createFront05CrmActionPort(crmService)` como dependência CRM do engine.
5. Exercitar start/pause/resume/status/eventos ponta a ponta após merge.

## Critério de fechamento

A Frente04 só muda para 🟢 quando rotas, persistência/RBAC, schema/backend, build/typecheck integrado e fluxos ponta a ponta estiverem testáveis pelo usuário.
