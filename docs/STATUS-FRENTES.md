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
- Status inicial: NÃO INICIADA
- Responsável: chat/agente designado pelo usuário
- Último commit relevante: —
- Entregue: —
- Em andamento: —
- Bloqueios: —
- Próximo passo: iniciar pela leitura da documentação obrigatória.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status: EM ANDAMENTO
- Responsável: chat atual — Frente05
- Último commit relevante: `6f5f26386dd757c0788d6ce64d5212971c520c10`
- Entregue: contratos CRM/Inbox; persistência local sem dados fictícios; CRUD de SalesBot; catálogo completo de blocos; configuração por bloco; duplicar/ativar/pausar/excluir; Automatize com gatilhos, condições e ações configuráveis; CRUD/configuração de agentes IA; estrutura e tela de integrações; logs/execuções; workspace consolidado; API pública da Frente05.
- Em andamento: validação técnica isolada, ajustes de acabamento e preparação do handoff.
- Bloqueios: a Frente05 não pode editar o shell/roteador raiz da Frente01; portanto o workspace ainda não está montado na navegação geral. Integração real com CRM/Inbox depende da Frente04. WhatsApp/Meta/provedor IA reais permanecem fora desta fase por decisão de produto.
- Próximo passo: validar build após montagem pelo integrador/Frente01 e validar contratos ponta a ponta com Frente04.

---

# Pedidos entre frentes

Use esta seção quando uma frente precisar que outra altere um arquivo ou contrato que não pertence ao seu escopo.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente05
- Destino: Frente01
- Necessidade: montar/importar `Front05Workspace` na navegação interna da plataforma usando a API pública `src/features/automations/index.ts`.
- Arquivo/contrato afetado: roteador/shell global da Frente01; não editar pela Frente05.
- Motivo: permitir teste visual integrado de SalesBot, Automatize, Agentes IA, Execuções e Integrações sem violar propriedade de arquivos.
- Urgência: alta para demonstração.
- Status: PENDENTE

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente05
- Destino: Frente04
- Necessidade: consumir `salesBotCommandPort`/`aiAgentCommandPort` pela Inbox e emitir eventos CRM conforme `CrmAutomationEvent` para Automatize.
- Arquivo/contrato afetado: `src/features/automations/contracts.ts` e `src/features/automations/index.ts`.
- Motivo: integração ponta a ponta CRM/Inbox ↔ automações/SalesBot/IA sem acoplamento.
- Urgência: alta para integração final.
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
- Montar `Front05Workspace` no shell/roteador da Frente01.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
