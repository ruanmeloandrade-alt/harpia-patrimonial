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
- Status: EM ANDAMENTO — ESCOPO PRÓPRIO IMPLEMENTADO, AGUARDANDO INTEGRAÇÕES OBRIGATÓRIAS E VALIDAÇÃO GLOBAL
- Responsável: chat atual — Frente04
- Último commit relevante: `3ceae4b8734e09527a5ecd12c4cf14f92164e0ed`
- Último commit de implementação relevante: `b2b6e154fd6a1336fa684fa5b66d18f24d5412e0`
- Entregue/implementado: domínio CRM; repositórios vazios por padrão; serviços de funis, etapas, leads, tags, campos personalizados, tarefas, histórico e eventos; Kanban configurável; Lead 360 com edição completa de contato/contexto/observações; campos personalizados por tipo; fila de leads sem etapa; contrato de conversão sem mensagem automática; Inbox de três colunas; contratos de mensagem; ações de CRM pela Inbox; portas de SalesBot/IA; `Front04Workspace`; documentação de integração, handoff e mapeamento de adapter com a Frente05.
- Validação própria executada: revisão estrutural de CRM/Inbox; checagem isolada de TypeScript/sintaxe do `CrmWorkspace` atualizado e da fila de leads sem etapa sem erros; revisão das proteções de integridade e estados vazios; compatibilidade do contrato Frente02 → Frente04 conferida contra `front04ConversionAdapter.ts`; contratos reais da Frente05 comparados e mapeados em `docs/frentes/FRENTE-04-FRENTE-05-ADAPTER.md`.
- NÃO VERIFICADO: build completo da aplicação integrada; rota protegida; RBAC real; persistência multiusuário/backend; fluxo real Frente02 → CRM no produto montado; referências reais Frente03; SalesBot/IA/Automatize ponta a ponta; WhatsApp real; teste ponta a ponta pelo usuário.
- Bloqueios para ficar VERDE/testável: Frente01 montar `Front04Workspace`, fornecer usuários internos e persistência definitiva; integrador montar o adapter Frente04↔Frente05 com `botId/agentId/executionId`; montar o adapter já compatível da Frente02 para conversões reais. Integração com Frente03 é necessária para referências reais de catálogo e dashboard, mas não bloqueia o CRM manual básico.
- Próximo passo da Frente04: revisar e corrigir qualquer problema que apareça no merge/build integrado. Não há outro bloco funcional exclusivo pendente identificado neste momento.
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
- Necessidade: montar `Front04Workspace` em rota interna protegida e fornecer usuários internos no formato `{ id, name }`; posteriormente conectar adapter de persistência compartilhada/backend aos contratos `CrmRepository` e `InboxRepository`.
- Arquivo/contrato afetado: shell/roteador interno, autenticação/RBAC, persistência compartilhada e integração de `src/features/crm/Front04Workspace.tsx`.
- Motivo: liberar CRM e Inbox para teste integrado sem a Frente04 editar arquivos globais pertencentes à Frente01.
- Urgência: ALTA
- Status: PENDENTE

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente04
- Destino: Frente05 / integrador
- Necessidade: conectar a Inbox aos contratos reais `SalesBotCommandPort`/`AIAgentCommandPort` e mapear eventos CRM para `CrmAutomationEvent`.
- Arquivo/contrato afetado: contratos da Frente04 + `src/features/automations/contracts.ts` da Frente05. Mapeamento documentado em `docs/frentes/FRENTE-04-FRENTE-05-ADAPTER.md`.
- Motivo: permitir iniciar/pausar/consultar SalesBot e IA pela Inbox e alimentar Automatize sem acoplamento ou conversão silenciosa de eventos.
- Urgência: ALTA para integração final.
- Status: PENDENTE — contratos comparados e mapeamento pronto; falta branches montadas juntas para implementar/testar adapter real.

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04; os contratos já foram conferidos como compatíveis.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05 usando adapter documentado.
- Integrar eventos CRM da Frente04 com Automatize da Frente05 usando o mapeamento documentado.
- Montar `Front04Workspace` no shell interno protegido da Frente01.
- Trocar adapters locais da Frente04 por persistência compartilhada/backend sem reescrever serviços/UI.
- Conectar usuários internos da Frente01 como responsáveis do CRM.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
