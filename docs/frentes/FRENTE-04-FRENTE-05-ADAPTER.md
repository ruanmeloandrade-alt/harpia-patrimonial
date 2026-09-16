# Adapter Frente04 ↔ Frente05

Data-base: 16/09/2026

Objetivo: documentar o encaixe entre a Inbox da Frente04 e os contratos reais já implementados pela Frente05, sem duplicar motor de SalesBot/IA e sem introduzir mock operacional.

## Contratos atuais

### Frente04 — InboxAutomationPort

A Inbox opera no contexto de lead/conversa e expõe comandos de alto nível:

- iniciar SalesBot;
- pausar SalesBot;
- iniciar Agente IA;
- pausar Agente IA;
- consultar status agregado da conversa.

A interface da Frente04 aceita `leadId`, `conversationId` e opcionalmente `botId`/`agentId` ao iniciar.

### Frente05 — contratos de runtime

A Frente05 expõe:

- `SalesBotCommandPort.start({ botId, leadId?, conversationId?, context? })`;
- `SalesBotCommandPort.pause({ executionId, reason? })`;
- `SalesBotCommandPort.resume({ executionId })`;
- `SalesBotCommandPort.getStatus(executionId)`;
- `AIAgentCommandPort.invoke({ agentId, leadId?, conversationId?, context? })`;
- `AIAgentCommandPort.pause({ executionId, reason? })`;
- `AIAgentCommandPort.getStatus(executionId)`.

A Frente05 retorna `AutomationCommandResult` com `status`, `executionId` e `reason` quando aplicável.

## Mapeamento obrigatório no integrador

O adapter entre as duas frentes deve:

1. Receber `botId` ao iniciar SalesBot e chamar `SalesBotCommandPort.start`.
2. Receber `agentId` ao iniciar IA e chamar `AIAgentCommandPort.invoke`.
3. Guardar o `executionId` retornado por recurso e por contexto de conversa/lead.
4. Ao pausar SalesBot, resolver o `executionId` ativo e chamar `SalesBotCommandPort.pause`.
5. Ao pausar IA, resolver o `executionId` ativo e chamar `AIAgentCommandPort.pause`.
6. Para status, consultar os `executionId` ativos e converter os estados da Frente05 para o estado agregado da Inbox.
7. Se não houver `botId`, `agentId` ou `executionId` aplicável, retornar/mostrar indisponível ou não configurado; nunca fingir execução.
8. Se a Frente05 retornar `rejected` ou `not_configured`, apresentar o `reason` na Inbox e não marcar como rodando.

## Conversão de status sugerida

SalesBot/IA Frente05 → Inbox Frente04:

- `running` → `running`
- `paused` → `paused`
- `completed` → `idle`
- `failed` → `idle` + feedback de erro
- `not_found` → `idle`
- ausência de configuração/ID → `unavailable`

## Seleção de bot/agente

A Inbox não deve escolher silenciosamente um SalesBot ou Agente IA arbitrário. O integrador deve fornecer o `botId`/`agentId` selecionado/configurado para aquele contexto, ou adicionar seleção explícita na UI quando o produto definir múltiplas opções por conversa.

Até essa definição existir, o comando deve permanecer indisponível em vez de assumir um bot/agente padrão fictício.

## Eventos CRM → Automatize

Também há diferença nominal entre eventos atuais:

Frente04 já emite/prepara:

- `lead.created`
- `lead.updated`
- `lead.stage_changed`
- `lead.assignee_changed`
- `lead.tag_added`
- `lead.tag_removed`
- `lead.custom_field_changed`
- `lead.task_created`
- `lead.task_updated`
- `lead.inactivity_detected`

Frente05 consome `CrmAutomationEventType`:

- `lead.created`
- `lead.stage_changed`
- `lead.field_changed`
- `lead.tag_added`
- `lead.tag_removed`
- `lead.inactivity`
- `task.due`
- `custom.event`

O integrador deve mapear:

- `lead.custom_field_changed` → `lead.field_changed`
- `lead.inactivity_detected` → `lead.inactivity`
- eventos sem equivalente direto (`lead.updated`, `lead.assignee_changed`, `lead.task_created`, `lead.task_updated`) só devem virar `custom.event` ou outro gatilho se houver decisão explícita de produto; não converter silenciosamente.

## Regra de ownership

- Frente04 continua dona da experiência CRM/Inbox.
- Frente05 continua dona do motor de SalesBot, Automatize, IA e runtime.
- O adapter pode morar na camada de integração/pente fino após os branches serem montados juntos.
- Nenhuma frente deve copiar o motor da outra.

## Critério para verde

Este vínculo só pode ficar 🟢 quando:

- os contratos estiverem montados juntos;
- `botId`/`agentId` reais forem resolvidos;
- `executionId` for persistido/consultado corretamente pelo adapter;
- start/pause/status forem exercitados de ponta a ponta;
- eventos CRM forem recebidos pelo Automatize com o mapeamento definido;
- falhas e `not_configured` não forem apresentadas como sucesso.
