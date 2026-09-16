# Adapter Frente04 ↔ Frente05

Data-base: 16/09/2026

Objetivo: registrar o encaixe real entre CRM/Inbox da Frente04 e os contratos públicos atuais da Frente05, sem duplicar motores e sem introduzir mock operacional.

## Estado atual

🟠 O adapter do lado Frente04 já existe em `src/features/crm/front05Adapter.ts` e foi validado isoladamente. Continua laranja porque as branches ainda precisam ser montadas juntas e exercitadas com `botId`, `agentId`, automações e backend reais.

## API implementada pela Frente04

### `createFront05InboxAutomationAdapter(...)`

Adapta os contratos da Frente05 para o `InboxAutomationPort` já consumido pela Inbox.

Recebe:

- `SalesBotCommandPort` compatível;
- `AIAgentCommandPort` compatível;
- `resolveSalesBotId(context)`;
- `resolveAiAgentId(context)`.

Comportamento:

1. resolve `botId`/`agentId` real;
2. inicia o recurso na Frente05;
3. preserva `executionId` por lead/conversa;
4. pausa pelo `executionId` correto;
5. se SalesBot estiver pausado, `startSalesBot` usa `resume` na mesma execução em vez de criar outra silenciosamente;
6. consulta status da execução;
7. converte `running`/`paused`/`completed`/`failed`/`not_found` para o estado agregado da Inbox;
8. ausência de configuração fica `unavailable`;
9. `rejected` e `not_configured` são propagados como erro/feedback e nunca como sucesso.

O adapter preserva também `botId`/`agentId` recebidos explicitamente durante a vida da instância, evitando que uma execução iniciada explicitamente passe a aparecer como indisponível na consulta seguinte.

## Seleção de SalesBot/agente

A Inbox não escolhe automaticamente um bot ou agente arbitrário.

O integrador deve fornecer:

- `resolveSalesBotId({ leadId, conversationId })`;
- `resolveAiAgentId({ leadId, conversationId })`.

Esses resolvedores devem usar configuração real da operação/cliente. Se não existir configuração, o recurso permanece indisponível.

## `createFront05CrmActionPort(crmService)`

Expõe o CRM da Frente04 no formato esperado pelo `CrmActionPort` da Frente05:

- `moveStage` → `crm.moveLead`;
- `assignOwner` → `crm.assignLead`;
- `createTask` → `crm.createTask`;
- `updateField` → `crm.setCustomFieldValue`;
- `addTag` → `crm.addTagToLead`;
- `removeTag` → `crm.removeTagFromLead`.

Erros de integridade do CRM viram `AutomationCommandResult.status = rejected` com `reason`; não existe sucesso falso.

A Frente04 também passou a evitar publicação redundante de eventos quando estágio, responsável, campo personalizado ou status de tarefa já possuem o mesmo valor. Isso reduz risco de loops de automação em escritas idempotentes.

## `Front05CrmEventSink`

Implementa `CrmEventSink` da Frente04 e recebe como destino um processor compatível com `processCrmAutomationEvent` da Frente05.

Fluxo esperado após merge:

```text
CrmService
  → CrmEventSink
  → Front05CrmEventSink
  → toFront05CrmAutomationEvent
  → processCrmAutomationEvent
  → AutomationEngineDependencies
      ├─ salesbot: Frente05
      ├─ ai: Frente05
      ├─ crm: createFront05CrmActionPort(crmService)
      └─ webhook: integração correspondente
```

## Mapeamento de eventos

Frente04 → Frente05:

- `lead.created` → `lead.created`
- `lead.stage_changed` → `lead.stage_changed`
- `lead.custom_field_changed` → `lead.field_changed`
- `lead.tag_added` → `lead.tag_added`
- `lead.tag_removed` → `lead.tag_removed`
- `lead.inactivity_detected` → `lead.inactivity`
- `lead.updated` → `custom.event` + `sourceEventType`
- `lead.assignee_changed` → `custom.event` + `sourceEventType`
- `lead.task_created` → `custom.event` + `sourceEventType`
- `lead.task_updated` → `custom.event` + `sourceEventType`

Nenhum evento é convertido silenciosamente para um gatilho semanticamente diferente.

## Contratos da Frente05 usados como referência

A versão atual considerada expõe:

- `SalesBotCommandPort.start/pause/resume/getStatus`;
- `AIAgentCommandPort.invoke/pause/getStatus`;
- `AutomationCommandResult` com `status`, `executionId`, `reason` e `data` opcional;
- `CrmActionPort`;
- `CrmAutomationEvent`;
- `processCrmAutomationEvent`.

## Validações realizadas

- TypeScript isolado do adapter: OK.
- Teste comportamental do adapter atualizado: OK.
- Cenários exercitados: SalesBot com `botId` explícito, start, pause, resume na mesma execução, consulta de status e mapeamento `lead.custom_field_changed` → `lead.field_changed`.
- Adapter de ações CRM revisado para rejeitar valor incompatível em campo personalizado.

## Pendente para 🟢

- branches F04/F05 montadas juntas;
- resolvedores reais de `botId`/`agentId`;
- teste com SalesBot configurado real;
- teste com agente IA configurado real;
- ligação `Front05CrmEventSink` → `processCrmAutomationEvent` real;
- `createFront05CrmActionPort` entregue ao engine real;
- build/typecheck do produto integrado;
- teste visual e ponta a ponta pela Inbox.
