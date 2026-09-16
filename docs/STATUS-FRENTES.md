# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Estado observado pela Frente04: 🟠 EM ANDAMENTO — backend dedicado ativo, shell/rotas integradas evoluíram; QA final ainda pendente.
- A Frente04 não substitui o status autoritativo mantido pela própria Frente01.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Consultar status autoritativo na própria branch.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Consultar status autoritativo na própria branch.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status geral: 🟠 EM ANDAMENTO — ESCOPO PRÓPRIO CONCLUÍDO EM GRANDE PARTE; INTEGRAÇÃO REAL AGORA EXISTE E ESTÁ EM PENTE-FINO.
- Responsável: chat atual — Frente04
- Último commit funcional relevante antes deste status: `fcd78c9acb8ba5a37ea77a844723d050d870babc`.
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.

### Bloco A — fundação CRM

- 🟠 Domínio, serviços, eventos, repositórios e composição: implementados; falta build/typecheck integrado final.
- 🟠 Persistência compartilhada: a Frente01 já criou/aplicou `platform_module_state` no Supabase dedicado e a composição integrada já hidrata CRM/Inbox a partir dele. Falta QA multi-sessão e feedback de conflito.
- 🟠 Usuários internos: a Frente01 já possui carregamento de responsáveis reais; falta teste com usuário interno real.

### Bloco B — funis, etapas e Kanban

- 🟠 Criar/renomear/ativar/desativar funis: implementado.
- 🟠 Criar/renomear/reordenar/remover etapas com integridade: implementado.
- 🟠 Kanban e movimentação manual: implementados.
- 🟠 Fila de leads sem etapa: implementada em `Front04CrmScreen`, mas a composição observada da Frente01 ainda monta `CrmWorkspace` diretamente; integração precisa usar a entrada correta para não ocultar conversões novas sem `stageId`.

### Bloco C — Lead 360

- 🟠 Contato, origem, página, ação, interesse/referência e observações: implementados.
- 🟠 Responsável, tags, campos personalizados tipados, tarefas/próximas ações e histórico: implementados.
- 🟠 Teste real com persistência/RBAC: pendente.

### Bloco D — conversão site → CRM

- 🟠 Contrato preserva contato, origem, página, ação, interesse, `occurredAt` e `metadata`.
- 🟠 Regra absoluta `automaticMessageSent: false` mantida.
- 🟠 Backend da Frente01 já possui `public-lead-ingest` e RPC segura para criar lead no estado compartilhado sem INSERT anônimo direto.
- 🟠 Ponta a ponta público → backend → lead → fila sem etapa ainda precisa de teste integrado.

### Bloco E — Inbox

- 🟠 Layout obrigatório de três colunas implementado.
- 🟠 Contexto CRM, mudança de etapa entre funis, responsável, tags, campos tipados e tarefas implementados.
- 🟠 Envio continua bloqueado sem transporte real; nenhuma mensagem é simulada.
- 🟠 Rotas `/interno/crm` e `/interno/inbox` já existem na Frente01.

### Bloco F — SalesBot / IA / Automatize

- 🟠 Adapter F04↔F05 implementado.
- 🟠 Seleção explícita de SalesBot e agente IA adicionada ao contrato da Frente04 por composição (`salesBots` / `aiAgents`), sem importar repositories internos da Frente05.
- 🟠 `getStatus` agora considera `botId`/`agentId` selecionados.
- 🟠 SalesBot pausado só é retomado se o recurso selecionado for o mesmo; trocar o bot cria outra execução em vez de retomar a errada.
- 🟠 IA com a mesma execução já rodando não dispara invocação duplicada.
- 🟠 Ponta a ponta com configurações reais continua pendente.

### Bloco G — Dashboard / métricas

- 🟠 Frente03 já possui adapter para snapshot CRM e evento `harpia:crm-updated`.
- 🟠 Runtime integrado da Frente01 já compõe provider comercial com o repository CRM compartilhado.
- 🟠 Teste visual/dados reais pendente.

### Bloco H — validação final

- 🔴 `npm run build` do produto integrado: NÃO VERIFICADO.
- 🔴 TypeScript completo das cinco frentes juntas: NÃO VERIFICADO.
- 🔴 Teste com primeiro administrador real: NÃO EXECUTADO.
- 🔴 CRUD + refresh/persistência real: NÃO EXECUTADO ponta a ponta.
- 🔴 teste de conflito de revisão em duas sessões: NÃO EXECUTADO.
- 🔴 WhatsApp real: NÃO CONECTADO, por decisão de fase.
- 🔴 validação final pelo usuário: ainda não executada.

### Bloqueios/restante para 🟢

1. Frente01/integrador montar `Front04CrmScreen` em vez de `CrmWorkspace` direto, preservando `UnassignedLeadsQueue`.
2. Integrador fornecer à Inbox as listas reais de SalesBots e agentes IA ativos usando as props públicas da Frente04.
3. Criar/promover usuário administrador real e executar RBAC real.
4. Executar build/typecheck do conjunto integrado.
5. Executar QA público→CRM, CRUD CRM, persistência/refresh, dashboard e Inbox↔F05.
6. Validar conflitos de edição concorrente e feedback de persistência.

Handoff principal: `docs/frentes/FRENTE-04-HANDOFF.md`.
Nota de integração atual: `docs/frentes/FRENTE-04-INTEGRACAO-F01-ATUAL.md`.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Consultar status autoritativo na própria branch.

---

# Pedidos entre frentes

- Data/hora: 16/09/2026 11:51 BRT
- Origem: Frente04
- Destino: Frente01 / integração global
- Necessidade: incorporar semáforo obrigatório 🔴/🟠/🟢 nas regras gerais.
- Status: RESOLVIDO.

- Data/hora: 16/09/2026 — atualização atual
- Origem: Frente04
- Destino: Frente01 / integrador
- Necessidade: usar `Front04CrmScreen` em `/interno/crm` no lugar de `CrmWorkspace` direto, mantendo a fila de leads sem etapa.
- Motivo: conversões públicas entram legitimamente sem `stageId`; sem a fila, o lead existe mas fica invisível nas colunas do Kanban.
- Urgência: ALTA.
- Status: PENDENTE NO ENCAIXE OBSERVADO.

- Data/hora: 16/09/2026 — atualização atual
- Origem: Frente04
- Destino: Frente01 / Frente05 / integrador
- Necessidade: fornecer SalesBots e agentes IA ativos à `InboxWorkspace`/`Front04InboxScreen` pelas props públicas `salesBots` e `aiAgents`.
- Motivo: preservar seleção explícita sem dependência direta da Frente04 em repositories internos da Frente05.
- Urgência: ALTA para QA de automação.
- Status: PENDENTE DE COMPOSIÇÃO FINAL.

- Data/hora: 16/09/2026 — atualização atual
- Origem: Frente04
- Destino: Integração global
- Necessidade: executar build/typecheck e QA real após consolidação das branches.
- Status: PENDENTE.

---

# Pendências de integração global

- Trocar montagem direta do CRM por `Front04CrmScreen`.
- Injetar listas reais de SalesBot/IA na Inbox pelo contrato público F04.
- Criar/promover primeiro administrador real e testar RBAC.
- Testar conversão Frente02 → `public-lead-ingest` → CRM → fila sem etapa.
- Testar métricas CRM no dashboard Frente03.
- Testar Inbox ↔ SalesBot/IA/Automatize ponta a ponta.
- Testar edição concorrente/persistência compartilhada.
- Executar build/typecheck/teste visual conjunto.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: implementação existe, mas falta integração/validação/teste para o usuário considerar concluído.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído, validações relevantes executadas e usuário pode testar.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
