# Frente03 — Handoff de Catálogo + Dashboard

Data: 16/09/2026
Branch: `frente-03`

Legenda:

- 🟢 completo e testável no escopo validado;
- 🟠 parcial/aguardando integração ou validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **INTEGRAÇÃO ESTRUTURAL MONTADA / AGUARDANDO SINCRONIZAÇÃO FINAL + BUILD/BROWSER QA.**

A Frente01 já destravou e montou a infraestrutura que bloqueava a Frente03: Supabase dedicado, runtime global, rota/menu, RBAC alternativo, experiência pública e CRM compartilhado. O backend do catálogo foi validado no projeto real. A frente ainda não recebe 🟢 geral porque a branch integradora precisa sincronizar as últimas mudanças da Frente03 e executar build/QA em navegador.

## 🟢 Catálogo — domínio e regras

Implementado e validado:

- empreendimento, unidade e imóvel avulso;
- código, nome, finalidade, descrição e localização;
- preço e faixa derivada;
- tipologia obrigatória para unidade;
- lançamento, características, estilos de vida e incorporadora/origem;
- fotos, vídeos, plantas e documentos;
- primeira foto como capa;
- exclusão lógica;
- código ativo único;
- proteção contra unidade órfã;
- duplicação segura para rascunho.

## 🟢 Máquina de estados

A mesma regra existe no repositório local, adapter Supabase e trigger do banco:

- `draft` → `published` ou `sold`;
- `published` → `paused` ou `sold`;
- `paused` → `published` ou `sold`;
- `sold` é terminal.

QA real no Supabase:

- `draft→paused`: rejeitado;
- `draft→published`: permitido;
- `published→draft`: rejeitado;
- `published→paused`: permitido;
- `paused→published`: permitido;
- `published→sold`: permitido;
- `sold→published`: rejeitado;
- `published_at` e `sold_at` preenchidos corretamente.

## 🟢 Persistência real — Supabase

Projeto: `Harpia Patrimonial` (`desxomqvtjaymwwxivwq`).

Migrations da Frente03 aplicadas:

- `catalog_front03`;
- `catalog_front03_grants_hardening`;
- `catalog_front03_select_policy_performance`;
- `catalog_front03_status_transitions`;
- `catalog_front03_media_storage`.

Validações reais:

- `anon` vê publicados e não vê rascunhos;
- `anon` possui apenas SELECT na tabela;
- `authenticated` possui SELECT/INSERT/UPDATE, sem DELETE bruto;
- `service_role` mantém DELETE;
- unidade sem tipologia é rejeitada;
- código ativo duplicado é rejeitado;
- empreendimento com unidade ativa não pode ser excluído;
- removendo logicamente a unidade antes, o pai pode ser removido;
- QA temporário terminou com 0 registros residuais.

## 🟢 RBAC real

Testado com identidades temporárias e rollback:

### `catalog.manage`

- cria: permitido;
- edita: permitido;
- publica sem `catalog.publish`: bloqueado.

### `catalog.publish`

- lê registros internos: permitido;
- muda status: permitido;
- altera conteúdo: bloqueado;
- cria item: bloqueado.

### `catalog.view`

- lê rascunhos internos: permitido;
- UPDATE: 0 linhas afetadas;
- conteúdo permaneceu inalterado;
- INSERT: bloqueado.

## 🟢 Catálogo público

`PublicCatalogService` fornece:

- `list(filters)`;
- `listUnits(parentId, filters)`;
- `getByIdOrCode(value)`;
- `getDevelopmentWithUnits(value)`;
- `getFilterOptions()`.

Garantias:

- só `published`;
- relação empreendimento/unidades;
- tipologia de unidade;
- faixa derivada das unidades publicadas;
- filtro por preço usando unidades reais;
- cidades/localizações/estilos derivados dos dados reais.

A Frente01 já monta `IntegratedPublicExperience` e passa `runtime.publicCatalogService` para a experiência da Frente02. Portanto, a integração estrutural pública está resolvida; resta QA browser/E2E.

## 🟢 Dashboard

Métricas patrimoniais:

- publicados;
- rascunhos;
- pausados;
- vendidos;
- estoque sem dupla contagem;
- cidade;
- finalidade.

Métricas CRM objetivas:

- leads;
- origem;
- próximas tarefas;
- demanda por região com `interest.referenceId`;
- interesse por produto medido por leads/interesses.

A Frente01 já usa repositório CRM compartilhado em `PlatformRuntime` e instancia `CrmSnapshotMetricsProvider(new CrmRepositorySnapshotSource(crmRepository), catalogRepository)`.

Não inferir por nome de etapa: visitas, propostas, negociações, vendas, VGV, ticket e conversão.

## 🟢 Mídia / Storage — backend e contrato

Bucket real: `catalog-media`.

- público para serving de mídia do catálogo;
- 50 MB por arquivo;
- JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- escrita/alteração/remoção/listagem operacional protegidas por `catalog.manage`;
- URLs estáveis;
- nomes opacos;
- `upsert:false`.

Código novo:

- `catalogMediaStorage.ts`;
- `SupabaseCatalogMediaStorage`;
- `catalog.storage.sql`.

O adapter passou typecheck estrito e teste de execução com cliente Supabase simulado.

`CatalogAdminPage` agora aceita `mediaStorage` e, quando presente, permite upload direto de fotos, vídeos, plantas e documentos. Sem adapter, o fluxo manual por URL continua funcional.

🟠 Falta validar upload real no navegador após a Frente01 injetar `new SupabaseCatalogMediaStorage(supabase)` no `IntegratedCatalog`.

## 🟢 Integração estrutural da Frente01

Confirmado no HEAD da Frente01:

- `PlatformRuntimeProvider` envolve a aplicação;
- runtime usa `SupabaseCatalogRepository`;
- runtime expõe `PublicCatalogService`;
- `IntegratedCatalog` e `IntegratedDashboard` existem;
- `/interno/catalogo` está no `AppRouter`;
- rota aceita qualquer uma de `catalog.view/manage/publish`;
- `InternalShell` possui link Catálogo com a mesma lógica;
- `IntegratedPublicExperience` usa `runtime.publicCatalogService`;
- Dashboard recebe métricas do CRM compartilhado.

## 🟠 Sincronização necessária na branch integradora

A Frente01 incorporou uma versão anterior dos arquivos da Frente03. Sincronizar antes do QA final:

- `src/features/catalog/catalogRepository.ts`;
- `src/features/catalog/supabaseCatalogRepository.ts`;
- `src/features/catalog/catalog.schema.sql`;
- `src/features/catalog/catalogMediaStorage.ts` (novo);
- `src/features/catalog/catalog.storage.sql` (novo);
- `src/features/catalog/CatalogAdminPage.tsx`;
- `src/features/catalog/Front03Workspace.tsx`;
- `src/features/catalog/index.ts`;
- `src/features/catalog/README.md`.

O diretório `src/features/dashboard/**` estava sincronizado por SHA no último pente-fino.

## 🟠 Tipos Supabase globais

`src/core/supabase/database.types.ts` da Frente01 ainda é anterior à tabela `catalog_items`.

A geração atual do projeto real já contém:

- `catalog_items`;
- `catalog_item_kind`;
- `catalog_purpose`;
- `catalog_status`.

Regenerar antes do build final. A porta estrutural do adapter da Frente03 aceita o cliente oficial mesmo antes dessa regeneração, portanto isso não bloqueia a composição em runtime.

## Advisors

- 🟢 Security Advisor: nenhum finding pertencente ao catálogo/Storage da Frente03.
- 🟠 Existem WARNs externos em funções compartilhadas `SECURITY DEFINER` (`list_internal_assignees`, `save_platform_module_state`). Ownership fora da Frente03. Remediação: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- 🟢 Performance: catálogo só apresenta índices `unused_index` como INFO, esperado em banco novo.
- 🟠 `platform_module_state` possui FK sem índice, fora da Frente03. Remediação: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## 🟠 Validação final

Ainda NÃO VERIFICADO:

- build Vite completo;
- QA visual em navegador;
- upload real do bucket pela UI integrada;
- fluxo E2E criar → editar → mídia → publicar → pausar → republicar → vender;
- confirmação visual de que publicado aparece no site e pausado/vendido deixam de aparecer;
- comportamento final do Dashboard com dados criados pelo usuário.

O executor isolado disponível usa Node 22, enquanto o projeto exige Node 24, e o acesso ao registry npm estava indisponível. Nenhum build não executado foi declarado como aprovado.

## Pedidos atuais para Frente01 / integrador

1. sincronizar os arquivos recentes da Frente03;
2. instanciar `SupabaseCatalogMediaStorage` no runtime/composição e passar para `IntegratedCatalog`;
3. regenerar `database.types.ts`;
4. executar build e QA browser/E2E.

## Estado para o usuário

🟢 Backend, RLS, RBAC, domínio, catálogo público, dashboard e integração estrutural estão implementados/validados nos níveis descritos.

🟠 A Frente03 permanece sem verde geral exclusivamente porque a versão integrada ainda precisa receber os arquivos mais recentes e passar build/browser/E2E real.
