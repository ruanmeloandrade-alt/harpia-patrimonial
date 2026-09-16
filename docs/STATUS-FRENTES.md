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
- Último commit relevante: `7bf0dcbc66c704f6bddc95288738d3b5d6d4037b`
- Entregue: documentação obrigatória lida; escopo executivo dividido em blocos; semáforo de progresso definido para apresentação ao usuário.
- Em andamento: Bloco A — fundação do CRM (modelo de dados, persistência, serviços e eventos).
- Bloqueios: nenhum bloqueio para iniciar o escopo próprio; integrações com Frente01, Frente02, Frente03 e Frente05 permanecem por contrato.
- Próximo passo: implementar `src/features/crm/**` e depois `src/features/inbox/**`, sem alterar arquivos globais da Frente01 e sem implementar motor de SalesBot/IA ou WhatsApp real.

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

---

# Pendências de integração global

Registrar aqui somente itens que dependem de merge ou decisão entre duas ou mais frentes.

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Conectar WhatsApp e Meta somente na fase final.
- Propagar o semáforo de progresso 🔴/🟠/🟢 para as regras gerais compartilhadas do projeto.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
