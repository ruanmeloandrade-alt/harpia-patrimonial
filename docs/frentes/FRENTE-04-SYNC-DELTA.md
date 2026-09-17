# Frente04 — delta mínimo para integração final

Data-base: 17/09/2026
Branch proprietária: `frente-04`

## Estado atual

A Frente01 encerrou o próprio escopo e já contém os blocos estruturais da F04: CRM/Inbox compartilhados, RBAC `view OR manage`, capacidades `manage` separadas, erro de persistência visível, F2→CRM, CRM→Dashboard e Inbox→F5.

O contrato F04↔F05 foi comparado novamente entre as branches atuais e continua compatível: `SalesBotCommandPort`, `AIAgentCommandPort`, `CrmActionPort`, `CrmAutomationEvent` e `AutomationCommandResult` não mudaram de forma incompatível.

## Delta funcional novo da F04 ainda a sincronizar

Commits:

- `b54e289a532422d4bec831818fdf6e71cf3c31ca` — preservar seleção SalesBot/IA por conversa;
- `42c2669cbb63d4721b14b8c36d8fbb719749c560` — preservar a mesma seleção também após remount realtime dentro da sessão.

Arquivo:

- `src/features/inbox/InboxWorkspaceCore.tsx`.

### Comportamento corrigido

Antes, ao alternar conversa, `selectedBotId` e `selectedAgentId` eram zerados. Uma execução podia continuar associada à conversa no adapter, enquanto a UI voltava com seletor vazio.

Agora:

- seleção de SalesBot é guardada por `conversationId`;
- seleção de agente IA é guardada por `conversationId`;
- trocar conversa restaura a escolha anterior daquela conversa;
- remount causado por realtime também preserva a escolha durante a mesma sessão;
- a memória é somente de módulo/sessão e não cria dado operacional persistente;
- nenhuma escolha automática de recurso foi introduzida.

## Integrações conferidas

### Frente02 → CRM

- `ingestPublicLead` usa o Edge Function real `public-lead-ingest`;
- resultado exige `leadId` real;
- `automaticMessageSent` permanece `false`;
- QA backend transacional já confirmou lead em CRM + exatamente um `lead.created` no outbox e rollback limpo.

### CRM → Dashboard Frente03

- `CrmRepositorySnapshotSource` lê `leads` e `tasks` do mesmo estado CRM compartilhado;
- `harpia:crm-updated` é disparado pelo repository integrado somente após save remoto confirmado;
- métricas não inferem visita/proposta/venda pelo nome de etapa.

### Inbox → Frente05

- contratos atuais permanecem compatíveis;
- F1 e F5 possuem o mesmo blob atual de `src/features/automations/contracts.ts` no contrato consumido pela F04;
- a Frente05 possui commits de hardening ainda fora da F1, mas eles não exigem mudança nova de contrato na F04 nesta checagem.

## QA backend já fechado

- RBAC `view/manage` CRM/Inbox;
- permissões separadas SalesBot/IA;
- leitura RLS de CRM/Inbox;
- bloqueio de escrita para viewer;
- optimistic locking real de CRM e Inbox;
- diretório de responsáveis;
- leitura F05 por domínio;
- conversão pública → CRM → outbox;
- todos os dados temporários removidos/revertidos após QA.

Detalhes: `docs/frentes/FRENTE-04-RBAC-QA.md`.

## Pendência técnica de integração

O `CrmService` ainda chama `persist()` e em seguida publica eventos para os sinks do browser. No repository Supabase da Frente01, `save()` é assíncrono/enfileirado.

Consequência: no caminho de mutação manual CRM→Automatize em browser, a automação pode começar antes da confirmação do save remoto. O Dashboard não sofre desse problema porque `harpia:crm-updated` só é emitido após persistência confirmada.

Não foi aplicado workaround na F04 porque suprimir/adiar eventos com base apenas em evento DOM de erro pode gerar perda silenciosa de automações em saves concorrentes. Esse ponto deve ser resolvido de forma atômica no integrador/repository ou migrando também as mutações manuais relevantes para um outbox confirmado.

## Bloqueios restantes para verde global

- sincronizar o delta novo de `InboxWorkspaceCore.tsx` na árvore integradora;
- resolver/decidir atomicidade de CRM manual → Automatize;
- build/typecheck conjunto em Node suportado;
- E2E visual/browser real;
- WhatsApp/Meta somente na fase definida para canais reais.

## Semáforo

- 🟠 CRM/Kanban/Lead 360 — backend/RBAC/locking validados; falta atomicidade browser→Automatize e QA visual.
- 🟠 Inbox — funcionalidade/hardening fechados; seleção por conversa corrigida na F04 e aguarda sync final.
- 🟢 Conversão pública backend F2→CRM→outbox — validada transacionalmente sem resíduos.
- 🟠 Dashboard — encaixe estrutural correto; falta QA visual.
- 🟠 F05 — contrato F04 compatível; integração final depende do sync/hardening da F5 na árvore global.
- 🔴 Verde global — depende de build/E2E e integração final.
