# Frente04 — integração CRM + Inbox

Este diretório pertence à Frente04. A integração agora expõe três entradas:

- `Front04CrmScreen` — recomendada para rota protegida por `crm.view`;
- `Front04InboxScreen` — recomendada para rota protegida por `inbox.view`;
- `Front04Workspace` — composição conjunta CRM + Inbox para demonstração ou contexto em que ambas as permissões estejam garantidas.

## Estado de dados

A Frente04 não contém dados fictícios. `BrowserCrmRepository` e `BrowserInboxRepository` começam vazios e usam `localStorage` apenas como adapter transitório de demonstração/continuidade local.

`Front04Workspace`, `Front04CrmScreen` e `Front04InboxScreen` aceitam injeção de `CrmService`, `InboxService`, `CrmRepository`, `InboxRepository` e `CrmEventSink` quando aplicável. Assim, a persistência definitiva pode ser conectada sem reescrever domínio/UI.

## Integração com Frente01

A Frente01 já expõe `listInternalUsers()` com usuários internos no formato de banco. A Frente04 agora fornece:

- `mapFront01Assignees(users)`;
- `loadFront01Assignees(listInternalUsers)`.

Esses adapters convertem somente usuários `internal` e ativos para `{ id, name }`.

Montagem recomendada após merge:

```tsx
import { Front04CrmScreen, Front04InboxScreen, loadFront01Assignees } from '../features/crm';
import { listInternalUsers } from '../features/users/user-service';
```

Rotas recomendadas no shell da Frente01:

- `/interno/crm` protegida por `PERMISSIONS.CRM_VIEW`;
- `/interno/inbox` protegida por `PERMISSIONS.INBOX_VIEW`.

As permissões `crm.manage` e `inbox.manage` continuam necessárias para autorização real das mutações na camada de dados/backend. Esconder botões não substitui autorização.

A Frente01 ainda deve fornecer:

- adapter definitivo de persistência/backend compatível com `CrmRepository` e `InboxRepository`;
- autorização/RLS real para operações protegidas.

Não há round robin ou distribuição automática embutida.

## Integração com Frente02

A Frente02 já implementou `createFront04ConversionHandler` compatível com `LeadConversionEvent`/`ingestLeadConversion`.

Campos previstos:

- contato conhecido;
- origem;
- ação;
- página;
- imóvel/produto/serviço de interesse;
- `occurredAt` e `metadata` no contrato de conversão.

Regra garantida: criação de lead não dispara mensagem automaticamente e retorna `automaticMessageSent: false`.

## Integração com Frente03

`LeadInterest.referenceId` pode receber a referência real do imóvel/produto fornecida pelo catálogo. A Frente04 não duplica o cadastro do catálogo.

## Integração com Frente05

A Frente05 passou a expor contratos reais `SalesBotCommandPort`, `AIAgentCommandPort`, `CrmActionPort`, `CrmAutomationEvent` e `processCrmAutomationEvent`.

A Frente04 agora fornece em `front05Adapter.ts`:

- `createFront05InboxAutomationAdapter(...)` — adapta `SalesBotCommandPort`/`AIAgentCommandPort` para o `InboxAutomationPort` consumido pela Inbox;
- `createFront05CrmActionPort(crmService)` — permite ao Automatize executar ações reais no CRM sem duplicar lógica;
- `Front05CrmEventSink` — converte eventos da Frente04 para o formato aceito pelo Automatize;
- `toFront05CrmAutomationEvent(...)` — mapeamento explícito de eventos.

Mapeamento de eventos:

- `lead.created` → `lead.created`;
- `lead.stage_changed` → `lead.stage_changed`;
- `lead.custom_field_changed` → `lead.field_changed`;
- `lead.tag_added` → `lead.tag_added`;
- `lead.tag_removed` → `lead.tag_removed`;
- `lead.inactivity_detected` → `lead.inactivity`;
- demais eventos da Frente04 → `custom.event` com `sourceEventType` no payload.

A Inbox não escolhe silenciosamente um bot/agente. O integrador deve fornecer `resolveSalesBotId` e `resolveAiAgentId`, preservando a regra de configuração por operação/cliente.

Na ausência de configuração real, os comandos permanecem indisponíveis ou retornam erro explícito; nunca existe sucesso simulado.

## Transporte de mensagens

A Inbox não conecta WhatsApp nesta frente.

`InboxTransportPort` é o contrato futuro de transporte. Sem uma implementação conectada:

- composer fica bloqueado;
- estado mostra `Canal não conectado`;
- nenhuma mensagem é criada como enviada;
- nenhum token ou ID é inventado.

## Critério para verde

O semáforo só deve mudar para 🟢 quando o bloco estiver integrado e realmente testável pelo usuário. Código escrito sem build/rota/validação permanece 🟠.
