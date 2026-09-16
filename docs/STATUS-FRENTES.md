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
- Status: EM ANDAMENTO — ESCOPO PRÓPRIO E ADAPTERS ENTRE FRENTES IMPLEMENTADOS; AGUARDANDO MONTAGEM/VALIDAÇÃO GLOBAL
- Responsável: chat atual — Frente04
- Último commit de implementação relevante: `2b12ad9108c7a96bb7d77b88e248ba13d82f8280`
- Entregue/implementado: domínio CRM; repositórios vazios por padrão; serviços de funis, etapas, leads, tags, campos personalizados, tarefas, histórico e eventos; Kanban configurável; Lead 360; fila de leads sem etapa; contrato de conversão sem mensagem automática; Inbox de três colunas; contratos de mensagem; ações de CRM pela Inbox; `Front04Workspace`; entradas separadas `Front04CrmScreen` e `Front04InboxScreen` para RBAC; injeção de services/repositories/event sinks; adapter de usuários reais da Frente01; adapter real para SalesBot/IA/Automatize da Frente05; persistência de `occurredAt` e `metadata` da conversão na origem do lead; proteção contra eventos redundantes em mudança de etapa/responsável/campo/status de tarefa; estilos CRM restritos ao próprio workspace.
- Integração Frente01 preparada: `mapFront01Assignees`/`loadFront01Assignees` convertem somente usuários internos ativos; telas separadas permitem montar CRM com `crm.view` e Inbox com `inbox.view`; persistência definitiva pode ser injetada por `CrmRepository`/`InboxRepository` sem reescrever UI.
- Integração Frente02 preparada: `createFront04ConversionHandler` da Frente02 foi conferido contra o contrato real da Frente04; `ingestLeadConversion` agora preserva contato, origem, página, ação, interesse, `occurredAt` e `metadata`, mantendo `automaticMessageSent: false`.
- Integração Frente05 preparada: `createFront05InboxAutomationAdapter`, `createFront05CrmActionPort`, `Front05CrmEventSink` e `toFront05CrmAutomationEvent` implementados; start/pause/status de SalesBot/IA preservam `executionId`; SalesBot pausado é retomado via `resume`; eventos CRM são mapeados explicitamente para o Automatize.
- Validações próprias executadas: revisão estrutural CRM/Inbox; checagens isoladas de TypeScript dos componentes anteriores; TypeScript isolado do adapter F04↔F05 = OK; teste comportamental do adapter atualizado = OK para `botId` explícito, start, pause, resume, status e mapeamento `lead.custom_field_changed` → `lead.field_changed`; revisão de proteção de integridade/empty states; revisão de CSS para evitar vazamento global.
- NÃO VERIFICADO: build completo com as cinco frentes montadas; rotas F04 realmente montadas no shell da Frente01; RBAC/backend real; persistência multiusuário; fluxo Frente02 → CRM no produto integrado; referências reais Frente03; SalesBot/IA/Automatize ponta a ponta com IDs/configurações reais; WhatsApp real; teste final pelo usuário.
- Bloqueios atuais para ficar VERDE/testável: Frente01 ainda precisa montar `Front04CrmScreen`/`Front04InboxScreen` no roteador e fornecer backend/persistência real; o Supabase dedicado da Hárpia ainda não está ativo segundo a Frente01. Integração final com Frente05 depende de branches montadas juntas e de `botId`/`agentId` reais/configurados. Frente02 já tem adapter compatível, mas o fluxo real depende da montagem conjunta.
- Próximo passo da Frente04: após merge/montagem, executar build/typecheck e testar rotas, RBAC, CRUD, refresh/persistência, site→CRM e Inbox↔SalesBot/IA/Automatize; corrigir regressões encontradas.
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
- Necessidade: incorporar às regras gerais do projeto o semáforo obrigatório de apresentação de progresso ao usuário: 🔴 não iniciado, 🟠 parcial/em andamento, 🟢 completo e testável.
- Arquivo/contrato afetado: `AGENTS.md` e/ou `docs/REGRAS-DE-PRODUCAO.md`.
- Motivo: solicitação explícita do usuário para que esse formato passe a valer como regra geral e não somente na Frente04.
- Urgência: ALTA
- Status: RESOLVIDO — regra incorporada em `docs/REGRAS-DE-PRODUCAO.md`, seção 21.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente04
- Destino: Frente01 / integrador
- Necessidade: montar `Front04CrmScreen` em rota interna protegida por `crm.view` e `Front04InboxScreen` por `inbox.view`; usar `loadFront01Assignees(listInternalUsers)` para responsáveis; injetar persistência compartilhada/backend por `CrmRepository` e `InboxRepository` quando disponível.
- Arquivo/contrato afetado: shell/roteador interno, autenticação/RBAC, persistência compartilhada e integração de `src/features/crm/**`.
- Motivo: liberar CRM/Inbox para teste integrado sem a Frente04 editar arquivos globais da Frente01.
- Urgência: ALTA
- Status: EM ANDAMENTO — shell, permissões e `listInternalUsers` já existem na Frente01; adapter do lado F04 está implementado; faltam montagem das rotas e backend/persistência definitiva.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente04
- Destino: Frente05 / integrador
- Necessidade: conectar os ports públicos reais da Frente05 ao adapter implementado em `src/features/crm/front05Adapter.ts` e ligar `Front05CrmEventSink` a `processCrmAutomationEvent`.
- Arquivo/contrato afetado: `src/features/crm/front05Adapter.ts` + API pública `src/features/automations/index.ts` da Frente05.
- Motivo: permitir start/pause/resume/status de SalesBot, start/pause/status de IA, ações do Automatize no CRM e eventos CRM→Automatize sem duplicar motores.
- Urgência: ALTA para integração final.
- Status: EM ANDAMENTO — adapter do lado F04 implementado e testado isoladamente; faltam montagem conjunta, IDs/configurações reais e teste ponta a ponta.

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Montar o adapter já compatível da Frente02 com `ingestLeadConversion` da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Montar `Front04CrmScreen` e `Front04InboxScreen` no shell interno protegido da Frente01.
- Trocar adapters locais da Frente04 por persistência compartilhada/backend real.
- Conectar usuários internos da Frente01 por `loadFront01Assignees`.
- Conectar `createFront05InboxAutomationAdapter` aos ports reais da Frente05.
- Conectar `Front05CrmEventSink` a `processCrmAutomationEvent` e fornecer `createFront05CrmActionPort` ao engine.
- Executar build/typecheck/teste visual conjunto após montagem.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
