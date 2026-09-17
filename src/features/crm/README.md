# Frente04 — integração CRM + Inbox

Este diretório pertence à Frente04. A integração expõe três entradas públicas:

- `Front04CrmScreen` — entrada recomendada para CRM integrado;
- `Front04InboxScreen` — entrada recomendada para Inbox integrada;
- `Front04Workspace` — composição conjunta CRM + Inbox para demonstração ou contexto já autorizado.

## Regra importante de montagem do CRM

Não montar `CrmWorkspace` sozinho na rota integrada.

Conversões públicas legítimas podem nascer sem `stageId`. `Front04CrmScreen` inclui `UnassignedLeadsQueue` + `CrmWorkspace` usando a mesma instância de `CrmService`, garantindo que todo lead sem etapa permaneça visível e classificável.

## Estado de dados

A Frente04 não contém dados fictícios.

`BrowserCrmRepository` e `BrowserInboxRepository` continuam disponíveis apenas como fallback/local adapter. Na integração real observada em 16/09/2026, a Frente01 já possui persistência compartilhada no Supabase (`platform_module_state`) com revisão otimista.

`Front04Workspace`, `Front04CrmScreen` e `Front04InboxScreen` aceitam injeção de `CrmService`, `InboxService`, `CrmRepository`, `InboxRepository` e `CrmEventSink` quando aplicável.

## Integração com Frente01

A Frente01 já possui:

- shell interno;
- `/interno/crm`;
- `/interno/inbox`;
- Supabase dedicado da Hárpia;
- hidratação do estado CRM/Inbox compartilhado;
- usuários internos para atribuição;
- composição das métricas CRM no dashboard.

A Frente04 fornece também:

- `mapFront01Assignees(users)`;
- `loadFront01Assignees(listInternalUsers)`.

Esses adapters convertem somente usuários `internal` e ativos para `{ id, name }`.

### Permissões

Enquanto a UI não possui modo somente leitura completo, a montagem administrativa pode continuar exigindo `crm.manage` / `inbox.manage`.

Não liberar uma tela mutável apenas com `crm.view` ou `inbox.view` confiando que a RLS recusará depois: o service atual atualiza o estado em memória antes da persistência assíncrona, o que produziria feedback visual enganoso para usuário sem permissão de escrita.

## Integração com Frente02

O contrato `LeadConversionEvent` preserva:

- contato;
- origem;
- ação;
- página;
- imóvel/produto/serviço de interesse;
- `occurredAt`;
- `metadata`.

Regra garantida: criação de lead não dispara mensagem automaticamente e retorna `automaticMessageSent: false`.

A Frente01 já disponibiliza o backend `public-lead-ingest`, evitando INSERT `anon` direto no CRM.

## Integração com Frente03

`LeadInterest.referenceId` recebe a referência real do imóvel/produto do catálogo.

O dashboard pode consumir a mesma fonte CRM via `CrmRepositorySnapshotSource` / `CrmSnapshotMetricsProvider`. O evento de atualização esperado é `harpia:crm-updated`.

## Integração com Frente05

A Frente04 fornece em `front05Adapter.ts`:

- `createFront05InboxAutomationAdapter(...)`;
- `createFront05CrmActionPort(crmService)`;
- `Front05CrmEventSink`;
- `toFront05CrmAutomationEvent(...)`.

Mapeamento de eventos:

- `lead.created` → `lead.created`;
- `lead.stage_changed` → `lead.stage_changed`;
- `lead.custom_field_changed` → `lead.field_changed`;
- `lead.tag_added` → `lead.tag_added`;
- `lead.tag_removed` → `lead.tag_removed`;
- `lead.inactivity_detected` → `lead.inactivity`;
- demais eventos → `custom.event` com `sourceEventType`.

### Seleção explícita de automação

A Inbox não importa repositories internos da Frente05 e não escolhe recurso automaticamente.

O integrador deve fornecer:

```ts
salesBots: Array<{ id: string; name: string }>
aiAgents: Array<{ id: string; name: string }>
```

Somente recursos ativos devem ser passados.

Exemplo conceitual:

```tsx
<Front04InboxScreen
  crmService={crmService}
  inboxService={inboxService}
  automationPort={automationPort}
  assignees={assignees}
  salesBots={activeSalesBots}
  aiAgents={activeAiAgents}
/>
```

A Inbox exige seleção explícita antes de iniciar.

O adapter também garante que:

- SalesBot pausado só é retomado quando o bot selecionado é o mesmo da execução preservada;
- trocar de bot cria nova execução em vez de retomar execução de outro bot;
- status respeita `botId`/`agentId` atualmente selecionados;
- IA já rodando com o mesmo agente não dispara invocação duplicada.

Na ausência de configuração real, os comandos permanecem indisponíveis/erro explícito. Nunca existe sucesso simulado.

## Transporte de mensagens

A Inbox não conecta WhatsApp nesta frente.

`InboxTransportPort` é o contrato de transporte. Sem implementação conectada:

- composer fica bloqueado;
- estado mostra `Canal não conectado`;
- nenhuma mensagem é criada como enviada;
- nenhum token ou ID é inventado.

## Critério para verde

O semáforo só muda para 🟢 quando o bloco estiver integrado e realmente testável pelo usuário.

Código escrito sem build/typecheck/rota/RBAC/persistência validados permanece 🟠.
