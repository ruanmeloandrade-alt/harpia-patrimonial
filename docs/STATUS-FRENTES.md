# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Dependência da Frente03: shell/roteador global, cliente Supabase oficial, RBAC e tipos gerados do banco.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Dependência da Frente03: consumir `PublicCatalogService` como fonte única do catálogo publicado.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status geral: 🟠 PARCIAL / BACKEND REAL VALIDADO, AGUARDANDO INTEGRAÇÃO GLOBAL E QA VISUAL
- Responsável: ChatGPT — Frente03
- Último commit funcional de schema: `fbe18f06f1929d061b36fc0c7f39dc3e1d07f816`
- Regra visual: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.

### Blocos próprios

- 🟢 Modelo de domínio do catálogo: empreendimento, unidade, imóvel avulso, tipologia, finalidade, localização, preço, estilos de vida e mídia.
- 🟢 Repositório/contrato do catálogo: CRUD, busca, publicação explícita, pausa, vendido, duplicação segura, exclusão lógica, código único e proteção contra unidades órfãs.
- 🟢 Contrato público: somente publicados; listagem, detalhe, unidades do empreendimento, faixa de preço derivada, filtros e opções derivadas de dados reais.
- 🟢 Filtro/faixa de preço: empreendimentos com unidades publicadas usam preços reais das unidades; o preço do pai só é usado quando não há unidade publicada com preço.
- 🟢 Valor de estoque: evita dupla contagem de empreendimento + unidades e exclui vendidos.
- 🟢 Métricas seguras do CRM: leads, origem, próximas tarefas e, com `referenceId` real + catálogo, demanda por região e interesse por produto baseado em leads.
- 🟢 `CrmRepositorySnapshotSource`: permite ao dashboard ler `CrmRepository.load()` e reagir ao evento `harpia:crm-updated`, sem exigir compartilhamento da mesma instância de `CrmService`.
- 🟢 Modelo de mídia: foto de capa, galeria, vídeos, plantas e documentos; IDs existentes preservados em edição.

### Supabase real

- 🟢 Projeto dedicado da Hárpia identificado e ativo: `desxomqvtjaymwwxivwq`.
- 🟢 Dependências da Frente01 verificadas no banco: `private.user_has_permission(uuid,text)`, `private.touch_updated_at()` e permissões `catalog.view`, `catalog.manage`, `catalog.publish`.
- 🟢 Migration `catalog_front03` aplicada com sucesso no Supabase real.
- 🟢 Migration `catalog_front03_grants_hardening` aplicada: grants mínimos explícitos para `anon`, `authenticated` e `service_role`.
- 🟢 Migration `catalog_front03_select_policy_performance` aplicada: leitura autenticada consolidada sem políticas permissivas duplicadas.
- 🟢 RLS público testado: `anon` enxergou itens publicados e não enxergou rascunho.
- 🟢 Grants testados: `anon` possui apenas SELECT; INSERT/UPDATE/DELETE = false.
- 🟢 Integridade real testada: unidade sem tipologia foi rejeitada pelo trigger.
- 🟢 Integridade real testada: empreendimento com unidade ativa não pôde ser excluído logicamente.
- 🟢 `published_at` foi preenchido por transição de status no banco real.
- 🟢 Dados temporários de QA removidos; `QA-F03-%` restante = 0.
- 🟢 Security Advisor: nenhum finding ligado ao catálogo. Há um INFO de outra frente em schema privado `private_f05`, fora do escopo da Frente03.
- 🟢 Performance Advisor: warning de políticas permissivas duplicadas do catálogo foi resolvido; restam apenas INFOs de índices ainda não usados em banco novo.

### UI / integração

- 🟠 `CatalogAdminPage`: fluxo implementado com loading, erro, empty state, CRUD, filtros, mídia e RBAC granular; falta build/browser integrado no produto conjunto.
- 🟠 `DashboardPage`: fluxo implementado com disponibilidade explícita de métricas e atualização por eventos do catálogo/CRM; falta build/browser integrado no produto conjunto.
- 🟠 `Front03Workspace`: pronto para montagem, mas rota/shell pertencem à Frente01/integrador.
- 🟠 Cliente Supabase oficial: `src/core/supabase/client.ts` da Frente01 já existe e é compatível por injeção com `SupabaseCatalogRepository`.
- 🟠 Tipos Supabase globais: o banco real já contém `catalog_items`, mas `src/core/supabase/database.types.ts` da Frente01 foi gerado antes dessa migration. A regeneração atual já inclui `catalog_items` e os enums `catalog_item_kind`, `catalog_purpose` e `catalog_status`; o arquivo global precisa ser regenerado pela Frente01/integrador.
- 🟠 RBAC no shell: Frente01 já possui as constantes corretas, mas ainda precisa montar `catalog.view/manage/publish` ao inserir a Frente03 nas rotas globais.
- 🟠 Upload/storage binário: associação por URLs permanentes está pronta; storage/upload compartilhado continua pendente.
- 🟠 Métricas comerciais avançadas: visitas, propostas, negociações, vendas, VGV/pipeline, ticket e conversão dependem de semântica/configuração explícita do CRM.

### Validação de build

- 🟠 Build Vite completo: **NÃO VERIFICADO** nesta branch isolada. O executor disponível usa Node 22 enquanto o repositório exige Node 24 e não havia registry npm acessível.
- 🟠 Lint global: **NÃO VERIFICADO** porque a branch isolada não possui script/configuração de lint.
- 🟠 Teste visual no navegador integrado ao shell: **NÃO VERIFICADO**.

### Próximo passo da Frente03

A dependência de Supabase da Frente01 foi resolvida. A Frente03 pode continuar assim que o integrador/Frente01:

1. regenerar `src/core/supabase/database.types.ts` a partir do schema atual;
2. montar `Front03Workspace` no `AppRouter`/`InternalShell`;
3. mapear `useAuth().hasPermission()` para `catalog.view`, `catalog.manage` e `catalog.publish`;
4. passar o cliente Supabase oficial para `SupabaseCatalogRepository`.

Depois disso, executar QA browser ponta a ponta e corrigir regressões de integração.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Dependência da Frente03: fonte real do CRM/repositório para métricas comerciais.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status nesta cópia: consultar a própria branch para o estado mais recente.
- Não bloqueia diretamente a Frente03.

---

# Pedidos entre frentes

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade: montar `Front03Workspace` no shell/roteador interno e ligar RBAC real.
- Arquivo/contrato afetado: `src/app/AppRouter.tsx`, `InternalShell`, `useAuth()`.
- Motivo: arquivos globais pertencem à Frente01; a Frente03 já entrega componentes desacoplados.
- Urgência: ALTA.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — atualizado após backend ativo
- Origem: Frente03
- Destino: Frente01 / Integrador
- Necessidade: regenerar `src/core/supabase/database.types.ts` usando o schema atual do projeto `desxomqvtjaymwwxivwq`.
- Arquivo/contrato afetado: tipos Supabase globais.
- Motivo: a versão atual da Frente01 foi gerada antes da migration do catálogo; a geração atual já contém `catalog_items` e enums do catálogo.
- Urgência: ALTA antes do build integrado.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — atualizado após backend ativo
- Origem: Frente03
- Destino: Frente01
- Necessidade anterior: aplicar `catalog.schema.sql` no Supabase dedicado.
- Resultado: migrations do catálogo aplicadas, RLS/grants/integridade testados e hardening concluído.
- Status: RESOLVIDO.

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente02 / Integrador
- Necessidade: consumir `PublicCatalogService`/contrato publicado.
- Arquivo/contrato afetado: busca e detalhe públicos.
- Motivo: manter uma única fonte de verdade.
- Urgência: ALTA.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — sessão atual
- Origem: Frente03
- Destino: Frente04 / Integrador
- Necessidade: fornecer o repositório/estado real do CRM à `CrmRepositorySnapshotSource`.
- Arquivo/contrato afetado: composição do Dashboard + CRM.
- Motivo: a Frente03 não deve duplicar dados do CRM.
- Urgência: MÉDIA/ALTA.
- Status: PENDENTE.

---

# Critério de status

- 🔴 NÃO INICIADO: nenhuma implementação relevante começou.
- 🟠 PARCIAL / EM ANDAMENTO: há trabalho ativo ou falta integração/validação/teste para concluir.
- 🟢 COMPLETO E TESTÁVEL: escopo concluído, validações relevantes executadas e usuário pode testar.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
