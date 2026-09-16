# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status: 🟠 EM ANDAMENTO — ESCOPO PRÓPRIO, ADAPTERS E SCHEMA DE PRODUÇÃO PREPARADOS; AGUARDANDO MONTAGEM/BACKEND/VALIDAÇÃO GLOBAL
- Responsável: chat atual — Frente04
- Último commit de implementação relevante: `81d76447b0b65b8f6cd884a9f1b942f25bd6d07a`
- Entregue/implementado: domínio CRM; repositórios vazios por padrão; serviços de funis, etapas, leads, tags, campos personalizados, tarefas, histórico e eventos; Kanban configurável; Lead 360; fila de leads sem etapa; contrato de conversão sem mensagem automática; Inbox de três colunas; campos personalizados tipados também dentro da Inbox; movimentação de lead pela Inbox entre etapas de qualquer funil ativo; contratos de mensagem; ações de CRM pela Inbox; `Front04Workspace`; entradas separadas `Front04CrmScreen` e `Front04InboxScreen` para RBAC; injeção de services/repositories/event sinks; adapter de usuários reais da Frente01; adapter real para SalesBot/IA/Automatize da Frente05; persistência de `occurredAt` e `metadata` da conversão na origem do lead; proteção contra eventos redundantes; estilos CRM restritos ao próprio workspace.
- Banco preparado: `src/features/crm/crm.schema.sql` define estrutura CRM/Inbox, integridade, índices, RLS e grants alinhados às permissões `crm.view`, `crm.manage`, `inbox.view`, `inbox.manage`. IDs CRM/Inbox são `text` para compatibilidade com o domínio atual; usuários permanecem UUID. `anon` não recebe acesso direto ao CRM; conversão pública e transporte real devem passar por backend seguro/Edge Function. O schema ainda NÃO FOI APLICADO nem validado no Supabase dedicado.
- Integração Frente01 preparada: `mapFront01Assignees`/`loadFront01Assignees` convertem somente usuários internos ativos; telas separadas permitem montar CRM com `crm.view` e Inbox com `inbox.view`; persistência definitiva pode ser injetada por `CrmRepository`/`InboxRepository`. A Frente01 já contém shell, permissões e usuários, mas o `AppRouter` atual ainda não monta as rotas da Frente04.
- Integração Frente02 preparada: `createFront04ConversionHandler` da Frente02 foi conferido contra o contrato real da Frente04; `ingestLeadConversion` preserva contato, origem, página, ação, interesse, `occurredAt` e `metadata`, mantendo `automaticMessageSent: false`.
- Integração Frente03 preparada: o adapter `CrmRepositorySnapshotSource` da Frente03 escuta `harpia:crm-updated`; `BrowserCrmRepository` da Frente04 já dispara exatamente esse evento em `save`/`clear`. Além disso, a Frente04 permite injetar a mesma instância/repositório CRM, então não há necessidade de duplicar estado para métricas.
- Integração Frente05 preparada: `createFront05InboxAutomationAdapter`, `createFront05CrmActionPort`, `Front05CrmEventSink` e `toFront05CrmAutomationEvent` implementados; start/pause/status preservam `executionId`; SalesBot pausado é retomado via `resume`; eventos CRM são mapeados explicitamente para o Automatize.
- Validações próprias executadas: revisão estrutural CRM/Inbox; checagens isoladas de TypeScript dos componentes anteriores; TypeScript isolado do adapter F04↔F05 = OK; teste comportamental do adapter = OK para `botId` explícito, start, pause, resume, status e mapeamento `lead.custom_field_changed` → `lead.field_changed`; revisão de proteção de integridade/empty states; revisão de CSS para evitar vazamento global; comparação estrutural com contratos atuais F01/F02/F03/F05.
- NÃO VERIFICADO: execução SQL do `crm.schema.sql`; advisors/RLS no Supabase real; build completo com as cinco frentes montadas; rotas F04 no shell da Frente01; persistência multiusuário; fluxo Frente02 → backend seguro → CRM; referências reais Frente03 no produto integrado; SalesBot/IA/Automatize ponta a ponta com IDs/configurações reais; WhatsApp real; teste final pelo usuário.
- Bloqueios atuais para ficar VERDE/testável: Frente01 precisa montar `Front04CrmScreen`/`Front04InboxScreen` no roteador; o Supabase dedicado da Hárpia ainda precisa estar disponível para aplicar/testar schema e persistência; a conversão pública precisa de endpoint/Edge Function segura porque `anon` não deve gravar diretamente no CRM; integração final com Frente05 depende de branches montadas juntas e `botId`/`agentId` reais/configurados.
- Próximo passo da Frente04: após montagem/backend, executar schema/advisors em ambiente Hárpia, build/typecheck e testes de rotas, RBAC, CRUD, refresh/persistência, site→CRM, dashboard CRM e Inbox↔SalesBot/IA/Automatize; corrigir regressões encontradas.
- Handoff: `docs/frentes/FRENTE-04-HANDOFF.md`.
- Adapter Frente05: `docs/frentes/FRENTE-04-FRENTE-05-ADAPTER.md`.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

---

# Pedidos entre frentes

Use esta seção quando uma frente precisar que outra altere um arquivo ou contrato que não pertence ao seu escopo.

Formato obrigatório:

- Data/hora:
- Origem:
- Destino:
- Necessidade:
- Arquivo/contrato afetado:
- Motivo:
- Urgência:
- Status: PENDENTE / EM ANDAMENTO / RESOLVIDO

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente04
- Destino: Frente01 / integração global
- Necessidade: incorporar às regras gerais o semáforo obrigatório 🔴/🟠/🟢.
- Arquivo/contrato afetado: `docs/REGRAS-DE-PRODUCAO.md`.
- Motivo: solicitação explícita do usuário.
- Urgência: ALTA
- Status: RESOLVIDO — regra incorporada na seção 21.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente04
- Destino: Frente01 / integrador
- Necessidade: montar `Front04CrmScreen` em rota protegida por `crm.view` e `Front04InboxScreen` por `inbox.view`; usar `loadFront01Assignees(listInternalUsers)`; injetar persistência compartilhada/backend.
- Arquivo/contrato afetado: shell/roteador interno, autenticação/RBAC, persistência e `src/features/crm/**`.
- Motivo: liberar CRM/Inbox para teste integrado sem a Frente04 editar arquivos globais da Frente01.
- Urgência: ALTA
- Status: EM ANDAMENTO — shell, permissões, usuários e arquivos F04 já estão presentes na Frente01; o `AppRouter` ainda não expõe as rotas CRM/Inbox e a persistência de produção ainda não foi ligada.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente04
- Destino: Frente05 / integrador
- Necessidade: conectar ports públicos reais da Frente05 ao adapter `src/features/crm/front05Adapter.ts` e ligar `Front05CrmEventSink` a `processCrmAutomationEvent`.
- Arquivo/contrato afetado: adapter F04 + API pública da Frente05.
- Motivo: permitir SalesBot/IA/Automatize reais sem duplicar motores.
- Urgência: ALTA
- Status: EM ANDAMENTO — adapter F04 implementado e testado isoladamente; faltam montagem conjunta, IDs/configurações reais e teste ponta a ponta.

- Data/hora: 16/09/2026 13:15 BRT
- Origem: Frente04
- Destino: Frente01 / integrador de backend
- Necessidade: após disponibilizar o projeto Supabase dedicado da Hárpia, revisar/aplicar `src/features/crm/crm.schema.sql`, rodar advisors e conectar persistência real. Criar também caminho backend/Edge Function autenticado/validado para conversões públicas gravarem leads sem conceder INSERT `anon` direto no CRM.
- Arquivo/contrato afetado: Supabase dedicado, `src/features/crm/crm.schema.sql`, composição backend de `LeadConversionEvent`.
- Motivo: concluir persistência multiusuário e preservar RLS/segurança do CRM público.
- Urgência: ALTA antes da operação real.
- Status: PENDENTE — schema preparado, mas não existe validação/aplicação em projeto Hárpia nesta frente.

- Data/hora: 16/09/2026 13:15 BRT
- Origem: Frente03
- Destino: Frente04 / integrador
- Necessidade: compartilhar a mesma fonte de CRM com `CrmSnapshotMetricsProvider`.
- Arquivo/contrato afetado: `BrowserCrmRepository`/`CrmRepository`, `Front04Workspace`, adapter de métricas F03.
- Motivo: dashboard deve ler o mesmo CRM sem duplicar estado.
- Urgência: MÉDIA/ALTA
- Status: RESOLVIDO DO LADO F04 — repository/service são injetáveis e `BrowserCrmRepository` já dispara `harpia:crm-updated`, exatamente o evento esperado pelo `CrmRepositorySnapshotSource` da Frente03. Falta somente a composição no integrador.

---

# Pendências de integração global

- Montar `Front04CrmScreen` e `Front04InboxScreen` no shell interno protegido da Frente01.
- Aplicar/testar `crm.schema.sql` somente no Supabase dedicado da Hárpia e conectar persistência real.
- Criar caminho backend seguro para conversão Frente02 → CRM sem INSERT anônimo direto.
- Montar o adapter já compatível da Frente02 com `ingestLeadConversion`.
- Compor o mesmo `CrmRepository`/snapshot com métricas da Frente03.
- Conectar usuários internos da Frente01 por `loadFront01Assignees`.
- Conectar `createFront05InboxAutomationAdapter` aos ports reais da Frente05.
- Conectar `Front05CrmEventSink` a `processCrmAutomationEvent` e fornecer `createFront05CrmActionPort` ao engine.
- Executar build/typecheck/teste visual conjunto após montagem.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: implementação existe, mas falta integração/validação/teste para o usuário considerar concluído.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído, validações relevantes executadas e usuário pode testar.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
