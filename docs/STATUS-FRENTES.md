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
- Status: EM ANDAMENTO
- Responsável: chat atual — Frente04
- Último commit relevante: `1e4f5a64fa8bf71fdabccc5a4dfae24b3ae2b179`
- Último commit de implementação relevante: `c6bd4263b90426bddf9cf7e2bc529c3b63838cfa`
- Entregue/implementado: modelo de domínio CRM; repositórios vazios por padrão; serviço de funis, etapas, leads, tags, campos personalizados, tarefas, histórico e eventos; Kanban configurável; ficha lateral de lead; contrato de conversão do site sem mensagem automática; Inbox de três colunas; contratos de mensagem; ações de CRM pela Inbox; portas de SalesBot/IA; componente único `Front04Workspace`; documentação de integração.
- Em andamento: acabamento de edição visual completa do lead/observações; validação de build/TypeScript; validação ponta a ponta; integração de rota protegida; persistência multiusuário/backend; usuários internos reais; contratos vivos com Frente05.
- Bloqueios para ficar VERDE/testável no produto integrado: encaixe do `Front04Workspace` no shell/rota interna da Frente01; adapter de persistência compartilhada/backend; usuários internos da Frente01 para responsáveis. SalesBot/IA permanecem corretamente indisponíveis até a Frente05 conectar.
- Próximo passo: concluir acabamento próprio da ficha do lead, validar o módulo isoladamente e entregar ao integrador/F01 o ponto único de montagem sem alterar arquivos globais fora da propriedade da Frente04.

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
- Status: PENDENTE

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
- Necessidade: implementar `InboxAutomationPort` e consumir eventos `CrmEventSink` quando SalesBot, IA e Automatize estiverem disponíveis.
- Arquivo/contrato afetado: `src/features/crm/contracts.ts` e contratos da Frente05.
- Motivo: permitir iniciar/pausar SalesBot e IA pela Inbox e reagir a eventos do CRM sem acoplamento entre módulos.
- Urgência: MÉDIA
- Status: PENDENTE

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Montar `Front04Workspace` no shell interno protegido da Frente01.
- Trocar adapters locais da Frente04 por persistência compartilhada/backend sem reescrever serviços/UI.
- Conectar usuários internos da Frente01 como responsáveis do CRM.
- Conectar WhatsApp e Meta somente na fase final.
- Propagar o semáforo de progresso 🔴/🟠/🟢 para as regras gerais compartilhadas do projeto.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
