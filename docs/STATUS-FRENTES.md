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
- Status geral: 🟠 PARCIAL / EM ANDAMENTO
- Responsável: ChatGPT — Frente03
- Último commit funcional relevante: `aa0e1fc66248e58343393a7b8bec49163b4d7528`
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.
- 🟢 Modelo de domínio do catálogo: empreendimento, unidade, imóvel avulso, estados e mídia.
- 🟢 Repositório/contrato do catálogo: CRUD, publicação explícita, pausa, vendido, duplicação segura, exclusão lógica e proteção contra unidades órfãs.
- 🟢 Contrato público: somente publicados, detalhe, filtros e opções de cidade/localização derivados dos dados reais.
- 🟢 Serviço de métricas do catálogo/dashboard: sem mocks e com fallback real para CRM não conectado.
- 🟠 `CatalogAdminPage`: implementada, mas build React/Vite completo e teste visual integrado ainda não foram concluídos.
- 🟠 `DashboardPage`: implementada, mas build React/Vite completo e teste visual integrado ainda não foram concluídos.
- 🟠 `Front03Workspace`: implementado para integração, mas depende do shell/roteamento da Frente01 para funcionar no produto conjunto.
- 🟠 Persistência de produção: contrato desacoplado pronto; adaptador atual usa `localStorage` até a infraestrutura compartilhada ser definida.
- 🟠 Mídia: associação por URL permanente implementada; storage/upload binário real ainda depende da infraestrutura comum.
- 🟠 Métricas comerciais: contrato pronto; dados reais dependem da Frente04.
- Validação executada: typecheck estrito da camada central passou; testes de execução passaram para criação, publicação, filtros públicos, dashboard, duplicação, exclusão lógica, bloqueio de exclusão de empreendimento com unidades e bloqueio de alteração de tipo que geraria unidade órfã.
- NÃO VERIFICADO: build Vite completo da branch; lint global; teste visual em navegador integrado ao shell; RBAC real; persistência compartilhada; storage real.
- Próximo passo: fechar validação do bloco React da Frente03 e preparar integração sem editar arquivos globais pertencentes à Frente01.

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

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: há trabalho ativo ou falta integração/validação/teste para concluir.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído, validações relevantes executadas e usuário pode testar.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
