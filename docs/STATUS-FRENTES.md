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
- Status: EM ANDAMENTO
- Responsável: ChatGPT — Frente03
- Último commit funcional relevante: `454c4f5201c4a5e1534ab9ad12ed36af2d7dba7f`
- Handoff parcial: `85440a6d36c228e3f0d29497e0263ada9c1f78e1`
- Entregue neste bloco: modelo de catálogo; repositório desacoplado com adaptador local sem mocks; CRUD administrativo; estados rascunho/publicado/pausado/vendido; duplicação segura; exclusão lógica; relação empreendimento/unidades; contrato público somente de publicados; filtros derivados de dados reais; dashboard de catálogo; contrato para métricas comerciais; `Front03Workspace` desacoplado.
- Em andamento: preparação para persistência compartilhada/storage e validação integrada no shell da plataforma.
- Bloqueios/dependências: RBAC e roteamento global dependem da Frente01; consumo público depende da Frente02; métricas comerciais dependem da Frente04; banco/storage compartilhados ainda precisam de infraestrutura definida.
- Validação: checagem local da camada TypeScript central realizada; build Vite completo, lint e teste end-to-end estão `NÃO VERIFICADOS` nesta sessão.
- Próximo passo: integrar um adaptador de persistência de produção quando a infraestrutura comum estiver disponível e executar validação completa sem invadir arquivos globais de outra frente.

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

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01
- Necessidade: integrar os módulos exportados pela Frente03 ao shell/roteador interno quando disponíveis.
- Arquivo/contrato afetado: roteador raiz / navegação interna (propriedade da Frente01)
- Motivo: a Frente03 não deve alterar arquivos globais protegidos; entrega `CatalogAdminPage`, `DashboardPage` e `Front03Workspace` desacoplados.
- Urgência: alta para demonstração.
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

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
