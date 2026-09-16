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
- Último commit funcional relevante: `ed0957e283a6533e1f297502d912725a303d9803`
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.
- 🟢 Modelo de domínio do catálogo: empreendimento, unidade, imóvel avulso, estados e mídia.
- 🟢 Repositório local/contrato do catálogo: CRUD, publicação explícita, pausa, vendido, duplicação segura, exclusão lógica e proteção contra unidades órfãs.
- 🟢 Contrato público: somente publicados, detalhe, filtros e opções de cidade/localização derivados dos dados reais.
- 🟢 Serviço de métricas do catálogo/dashboard: sem mocks e com disponibilidade explícita por métrica comercial.
- 🟢 Adapter de métricas CRM: quantidade de leads, origem e próximas tarefas derivadas da `snapshot()` real; typecheck e teste de execução passaram.
- 🟢 Adapter `SupabaseCatalogRepository`: contrato de produção injetável; typecheck e teste de execução com cliente Supabase simulado passaram.
- 🟠 Schema Supabase/RLS do catálogo: implementado com `catalog.view`, `catalog.manage` e `catalog.publish`, integridade pai/unidade e proteção de alteração; ainda precisa ser aplicado e testado no Supabase dedicado real.
- 🟠 `CatalogAdminPage`: CRUD/UI implementados e RBAC granular separado em leitura, edição e publicação; build React/Vite completo e teste visual integrado ainda não foram concluídos depois do ajuste final de RBAC.
- 🟠 `DashboardPage`: implementado e atualizado para não apresentar métricas CRM não suportadas como se fossem dados reais; build React/Vite completo e teste visual integrado ainda não foram concluídos.
- 🟠 `Front03Workspace`: implementado para integração, mas depende do shell/roteamento da Frente01 para funcionar no produto conjunto.
- 🟠 Persistência multiusuário real: adapter e schema prontos; depende da Frente01 aplicar o schema no projeto Supabase dedicado e injetar o cliente oficial.
- 🟠 Mídia: associação por URL permanente implementada; storage/upload binário real ainda depende da infraestrutura comum.
- 🟠 Métricas comerciais avançadas: visitas, propostas, negociações, vendas, VGV/pipeline, ticket, conversão e demanda por região dependem de configuração/contrato explícito; não são inferidas pelo nome das etapas.
- Validação executada: typecheck estrito e testes de execução do domínio/repositório público/dashboard; adapter CRM testado; adapter Supabase testado com cliente simulado.
- NÃO VERIFICADO: aplicação real do SQL/RLS no Supabase; build Vite completo da branch; lint global; teste visual em navegador integrado ao shell; storage real.
- Próximo passo: validar integração real com Supabase/RBAC/roteamento e fechar build/teste visual sem invadir arquivos globais pertencentes à Frente01.

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
- Necessidade: integrar os módulos exportados pela Frente03 ao shell/roteador interno.
- Arquivo/contrato afetado: roteador raiz / navegação interna (propriedade da Frente01)
- Motivo: a Frente03 não deve alterar arquivos globais protegidos; entrega `CatalogAdminPage`, `DashboardPage` e `Front03Workspace` desacoplados.
- Urgência: alta para demonstração.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01
- Necessidade: aplicar `src/features/catalog/catalog.schema.sql` no projeto Supabase dedicado da Hárpia após `core_auth.sql` e injetar o cliente oficial no `SupabaseCatalogRepository`.
- Arquivo/contrato afetado: Supabase compartilhado / persistência do catálogo.
- Motivo: finalizar persistência multiusuário e validar RLS sem a Frente03 criar outro cliente Supabase ou editar configuração global.
- Urgência: alta.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01
- Necessidade: mapear `useAuth().hasPermission()` para `catalog.view`, `catalog.manage` e `catalog.publish` ao montar a Frente03.
- Arquivo/contrato afetado: composição do shell/RBAC.
- Motivo: a UI da Frente03 já separa leitura, gestão e publicação; falta ligar às permissões reais.
- Urgência: alta.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente04 / Integrador
- Necessidade: permitir composição compartilhada do `CrmService` ou fonte de persistência comum para que `CrmSnapshotMetricsProvider` leia exatamente o mesmo estado usado pela Frente04.
- Arquivo/contrato afetado: `Front04Workspace` / criação da instância `CrmService`.
- Motivo: o `Front04Workspace` atual instancia o serviço internamente; o dashboard precisa consumir a mesma fonte sem duplicar CRM.
- Urgência: média/alta.
- Status: PENDENTE

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente02 / Integrador
- Necessidade: consumir `PublicCatalogService`/contrato publicado em vez de criar outra fonte de catálogo.
- Arquivo/contrato afetado: busca e detalhe públicos.
- Motivo: manter uma única fonte de verdade e expor apenas itens publicados.
- Urgência: alta.
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
