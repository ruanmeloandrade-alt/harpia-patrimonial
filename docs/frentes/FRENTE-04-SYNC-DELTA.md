# Frente04 — delta mínimo para integração final

Data-base: 17/09/2026
Branch proprietária: `frente-04`

## Estado atual

A Frente04 está baseada diretamente no head final informado da Frente01 (`bd6dbbc50dfe35841d6ca4ba6c930e6bc5d16cf5`) e está `0` commits atrás dela.

A árvore atual preserva somente os deltas próprios necessários da F04 sobre a base consolidada:

- seleção de SalesBot/agente IA preservada por conversa e durante remount realtime;
- barreira de persistência confirmada para eventos CRM → Automatize;
- ações Automatize → CRM só retornam `accepted` depois de a persistência compartilhada ser confirmada;
- documentação/QA próprios da Frente04.

## Inbox — seleção de automação por conversa

Arquivo principal: `src/features/inbox/InboxWorkspaceCore.tsx`.

Comportamento atual:

- SalesBot selecionado é guardado por `conversationId`;
- agente IA selecionado é guardado por `conversationId`;
- trocar de conversa restaura a escolha anterior daquela conversa;
- remount causado por realtime preserva a escolha durante a mesma sessão;
- a memória é somente de módulo/sessão e não cria dado operacional persistente;
- nenhuma escolha automática de recurso foi introduzida.

## CRM ↔ Automatize — atomicidade resolvida

Arquivos:

- `src/features/crm/repository.ts`;
- `src/app/integrations/sharedStateRepositories.ts`;
- `src/features/crm/front05Adapter.ts`.

Problema anterior:

O `CrmService` atualiza o estado em memória, chama `save()` e publica o evento de domínio logo depois. No repository Supabase, o `save()` real é enfileirado e assíncrono. Assim, uma automação podia observar uma alteração antes de o optimistic locking/save remoto confirmar.

Correção aplicada:

1. Cada `save()` do `SupabaseCrmRepository` registra uma barreira Promise ligada exatamente à operação de persistência enfileirada.
2. `Front05CrmEventSink` aguarda essa barreira antes de entregar o evento ao Automatize.
3. Se a persistência falhar ou houver conflito, o erro continua sendo exposto por `harpia:persistence-error` e o evento não é processado pela automação.
4. `createFront05CrmActionPort` também aguarda a mesma confirmação antes de devolver `accepted` para ações do Automatize sobre o CRM.
5. No repository síncrono de navegador, a barreira é resolvida imediatamente, preservando o comportamento local.

Resultado estrutural: nenhuma automação deve avançar com base em uma mutação CRM que ainda não foi confirmada pela fonte de verdade compartilhada.

## Integrações conferidas

### Frente02 → CRM

- `ingestPublicLead` usa o Edge Function real `public-lead-ingest`;
- resultado exige `leadId` real;
- `automaticMessageSent` permanece `false`;
- QA backend anterior confirmou lead em CRM + exatamente um `lead.created` no outbox e rollback limpo.

### CRM → Dashboard Frente03

- `CrmRepositorySnapshotSource` lê `leads` e `tasks` do mesmo estado CRM compartilhado;
- `harpia:crm-updated` é disparado pelo repository integrado somente após save remoto confirmado;
- métricas não inferem visita/proposta/venda pelo nome de etapa.

### Inbox → Frente05

- contratos atuais permanecem compatíveis;
- seleção de recurso continua explícita;
- execução é preservada durante recriações de runtime na mesma sessão;
- eventos CRM agora passam pela confirmação de persistência antes de acionar Automatize.

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

## Ainda NÃO VERIFICADO neste ambiente

- `npm run build` com Node 24;
- `npm run typecheck` completo;
- E2E visual/autenticado no navegador;
- conflito visual real entre duas sessões;
- fluxo completo Inbox ↔ SalesBot/IA/Automatize no navegador;
- WhatsApp/Meta reais, que continuam reservados para a fase final definida no projeto.

## Semáforo

- 🟠 CRM/Kanban/Lead 360 — implementação, RBAC, locking e atomicidade CRM↔Automatize fechados; falta validação executável/visual.
- 🟠 Inbox — implementação e hardening fechados; seleção por conversa corrigida; falta validação executável/visual.
- 🟢 Conversão pública backend F2→CRM→outbox — validada anteriormente sem resíduos.
- 🟠 Dashboard — encaixe estrutural correto; falta QA visual.
- 🟠 F05 — contrato e atomicidade com F04 resolvidos na branch F04; integração/QA final do produto ainda depende da árvore consolidada e navegador.
- 🔴 Verde global — não deve ser declarado antes de build/typecheck/E2E final.
