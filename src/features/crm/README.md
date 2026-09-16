# Frente04 — integração CRM + Inbox

Este diretório pertence à Frente04. O ponto único recomendado para integração visual é:

```tsx
import { Front04Workspace } from './features/crm';

<Front04Workspace
  assignees={usuariosInternos}
  automationPort={portaDaFrente05}
/>
```

## Estado de dados

A Frente04 não contém dados fictícios. `BrowserCrmRepository` e `BrowserInboxRepository` começam vazios e usam `localStorage` apenas como adapter transitório de demonstração/continuidade local.

Para operação multiusuário, o integrador deve implementar adapters dos contratos `CrmRepository` e `InboxRepository` usando a camada de persistência compartilhada definida pela Frente01. O serviço e a UI não devem ser reescritos para isso.

## Integração com Frente01

A Frente01 deve fornecer:

- rota interna protegida para CRM/Inbox;
- usuários internos autorizados como `{ id, name }` para responsáveis;
- adapter de persistência compartilhada/backend quando a camada estiver pronta;
- validação de permissões no backend/camada de dados para ações protegidas.

Não há round robin ou distribuição automática embutida.

## Integração com Frente02

Usar `ingestLeadConversion(crmService, event)` ou adaptar o mesmo contrato para eventos de conversão do site.

Campos previstos:

- contato conhecido;
- origem;
- ação;
- página;
- imóvel/produto/serviço de interesse;
- metadados futuros.

Regra garantida: criação de lead não dispara mensagem automaticamente.

## Integração com Frente03

`LeadInterest.referenceId` pode receber a referência real do imóvel/produto fornecida pelo catálogo. A Frente04 não duplica o cadastro do catálogo.

## Integração com Frente05

A Inbox consome `InboxAutomationPort` para:

- iniciar SalesBot;
- pausar SalesBot;
- iniciar agente IA;
- pausar agente IA;
- consultar status.

Na ausência dessa integração, `UnavailableInboxAutomationPort` retorna estado `unavailable` e bloqueia execução, sem simular sucesso.

Eventos produzidos pelo CRM seguem `CrmEventSink` e incluem:

- `lead.created`;
- `lead.updated`;
- `lead.stage_changed`;
- `lead.assignee_changed`;
- `lead.tag_added`;
- `lead.tag_removed`;
- `lead.custom_field_changed`;
- `lead.task_created`;
- `lead.task_updated`;
- `lead.inactivity_detected` reservado para mecanismo futuro.

## Transporte de mensagens

A Inbox não conecta WhatsApp nesta frente.

`InboxTransportPort` é o contrato futuro de transporte. Sem uma implementação conectada:

- composer fica bloqueado;
- estado mostra `Canal não conectado`;
- nenhuma mensagem é criada como enviada;
- nenhum token ou ID é inventado.

## Critério para verde

O semáforo só deve mudar para 🟢 quando o bloco estiver integrado e realmente testável pelo usuário. Código escrito sem build/rota/validação permanece 🟠.
