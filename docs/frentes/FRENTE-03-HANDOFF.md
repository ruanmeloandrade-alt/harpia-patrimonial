# Frente03 — Handoff de Catálogo + Dashboard

Data: 16/09/2026
Branch: `frente-03`

Legenda:

- 🟢 completo e testável no escopo validado;
- 🟠 parcial/aguardando integração ou validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **BACKEND REAL VALIDADO + INTEGRAÇÃO ESTRUTURAL MONTADA; AGUARDANDO SINCRONIZAÇÃO FINAL, TIPOS GLOBAIS E QA DE BUILD/NAVEGADOR.**

A Frente01 já entregou Supabase, auth/RBAC, runtime global, rota/menu, integração pública e CRM compartilhado. A Frente03 continuou avançando e fechou regras de integridade, visibilidade pública hierárquica, Storage e um factory de runtime único.

## 🟢 Domínio e repositórios

Coberto:

- empreendimento, unidade e imóvel avulso;
- código, nome, finalidade, descrição, localização, preço, lançamento, características, estilos de vida e origem;
- tipologia obrigatória para unidade;
- mídia: fotos, vídeos, plantas e documentos;
- CRUD, busca, duplicação, exclusão lógica e código ativo único;
- primeira foto como capa;
- adapters local e Supabase seguindo o mesmo contrato.

## 🟢 Máquina de estados

Mesma regra em local, adapter Supabase e trigger:

- `draft` → `published` ou `sold`;
- `published` → `paused` ou `sold`;
- `paused` → `published` ou `sold`;
- `sold` é terminal.

QA real confirmou bloqueios/permitidos e timestamps `published_at`/`sold_at`.

## 🟢 Integridade empreendimento/unidade

Regras finais:

- unidade exige pai ativo do tipo empreendimento;
- unidade nova/realocada não pode apontar para empreendimento vendido;
- unidade histórica já vinculada a pai vendido continua editável para correção cadastral;
- empreendimento não pode ser vendido enquanto existir unidade ativa não vendida;
- depois de vender todas as unidades, vender o empreendimento é permitido;
- empreendimento com unidades ativas não pode ser excluído nem convertido deixando órfãos;
- duplicação de unidade com pai vendido/indisponível é bloqueada.

QA real em transação + rollback confirmou:

- 🟢 venda do pai com unidade não vendida bloqueada;
- 🟢 venda do pai após todas as unidades vendidas permitida;
- 🟢 edição histórica sob pai vendido permitida;
- 🟢 criação de unidade sob pai vendido bloqueada;
- 🟢 realocação para pai vendido bloqueada.

Migration aplicada no banco real: `catalog_front03_sold_development_integrity`.
Arquivo incremental versionado: `catalog.sold-integrity.sql`.

## 🟢 Visibilidade pública hierárquica

Uma unidade `published` só é pública se o empreendimento pai também estiver `published` e ativo.

QA real:

- pai + unidade publicados → ambos visíveis publicamente;
- pai pausado com unidade ainda `published` → unidade deixa de ser pública;
- usuário interno com `catalog.view` continua vendo pai + unidade para administração.

A regra existe em:

- RLS real;
- `catalog.public-visibility.sql`;
- `PublicCatalogService`;
- Dashboard, que usa a mesma definição de “publicados/elegíveis”.

## 🟢 Persistência real — Supabase

Projeto: `Harpia Patrimonial` (`desxomqvtjaymwwxivwq`).

Migrations registradas:

1. `catalog_front03`;
2. `catalog_front03_grants_hardening`;
3. `catalog_front03_select_policy_performance`;
4. `catalog_front03_status_transitions`;
5. `catalog_front03_media_storage`;
6. `catalog_front03_public_unit_parent_visibility`;
7. `catalog_front03_sold_development_integrity`.

QA final desta rodada: 0 registros `QA-%`/`QA-F03-%` residuais.

## 🟢 RBAC real

- `catalog.manage`: cria/edita; não publica sem publish;
- `catalog.publish`: lê/muda status; não cria nem edita conteúdo;
- `catalog.view`: lê internamente; não grava;
- cliente autenticado comum: somente superfície pública, sem escrita interna.

## 🟢 Catálogo público

`PublicCatalogService` fornece:

- `list(filters)`;
- `listUnits(parentId, filters)`;
- `getByIdOrCode(value)`;
- `getDevelopmentWithUnits(value)`;
- `getFilterOptions()`.

Garantias:

- somente itens publicamente elegíveis;
- unidade depende do pai publicado;
- faixa de preço derivada das unidades;
- filtros/opções derivados de dados reais;
- `storagePath` não faz parte do contrato público.

A Frente01 já passa `runtime.publicCatalogService` à experiência da Frente02.

## 🟢 Dashboard

Patrimonial:

- publicados/elegíveis;
- rascunhos;
- pausados;
- vendidos;
- valor do estoque sem dupla contagem;
- cidade;
- finalidade.

CRM objetivo:

- leads;
- origem;
- próximas tarefas;
- demanda por região com `interest.referenceId`;
- interesse por produto baseado em leads.

Não inferir por nome de etapa: visita, proposta, negociação, venda, VGV, ticket ou conversão.

## 🟢 Mídia / Storage — backend e contrato

Bucket real: `catalog-media`.

- público para serving;
- limite 50 MB;
- JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- operações administrativas protegidas por `catalog.manage`;
- nomes opacos;
- `upsert:false`.

Código:

- `catalogMediaStorage.ts`;
- `catalog.storage.sql`;
- `CatalogMedia.storagePath` para lifecycle interno;
- `CatalogAdminPage` com upload direto opcional e URL manual de fallback.

Lifecycle administrativo:

- lote parcial é limpo se upload falha;
- uploads não salvos são limpos ao trocar/cancelar edição;
- mídia removida de um cadastro pode remover o objeto correspondente do Storage quando existe `storagePath`;
- caminho operacional não é devolvido pelo contrato público.

🟠 Falta upload real pela UI/browser porque a Frente01 ainda não injeta `mediaStorage` no `IntegratedCatalog`.

## 🟢 Factory de integração

Novo `catalogRuntime.ts`:

```ts
const catalogRuntime = createCatalogRuntime(requireSupabase());
```

Retorna, com o mesmo cliente oficial:

- `catalogRuntime.repository`;
- `catalogRuntime.publicCatalogService`;
- `catalogRuntime.mediaStorage`.

Objetivo: evitar composição duplicada e fontes/clientes divergentes na Frente01.

## 🟢 Integração estrutural já existente na Frente01

Confirmado no HEAD recente:

- `PlatformRuntimeProvider`;
- repositório Supabase do catálogo;
- serviço público do catálogo;
- `IntegratedCatalog`;
- `IntegratedDashboard`;
- `/interno/catalogo`;
- menu interno;
- permissões alternativas `catalog.view/manage/publish`;
- catálogo público compartilhado com Frente02;
- CRM compartilhado com Dashboard.

## 🟠 Pendências reais da Frente01 / integrador

### 1. Sincronizar a versão atual da Frente03

A branch integradora antecede as últimas correções. Sincronizar os arquivos próprios da Frente03, incluindo:

- `CatalogAdminPage.tsx`;
- `Front03Workspace.tsx`;
- `types.ts`;
- `catalogRepository.ts`;
- `supabaseCatalogRepository.ts`;
- `publicCatalog.ts`;
- `catalogMediaStorage.ts`;
- `catalogRuntime.ts`;
- `catalog.schema.sql`;
- `catalog.public-visibility.sql`;
- `catalog.sold-integrity.sql`;
- `catalog.storage.sql`;
- `index.ts`;
- Dashboard atualizado.

### 2. Expor Storage no runtime

O `IntegratedCatalog` atual da Frente01 ainda passa somente `repository` e `access`.

Preferência:

- criar runtime com `createCatalogRuntime(requireSupabase())`;
- expor `repository`, `publicCatalogService` e `mediaStorage` no `PlatformRuntime`;
- passar `mediaStorage={runtime.catalogMediaStorage}` ao `CatalogAdminPage`.

### 3. Regenerar tipos globais Supabase

O `src/core/supabase/database.types.ts` atual da Frente01 ainda não contém `catalog_items` nem enums do catálogo.

A Frente03 não altera esse arquivo por ownership global.

## Advisors

Checagem pós-migrations atual:

- 🟢 Security Advisor: **0 findings**;
- 🟢 Performance: apenas `unused_index` nível INFO, esperado no banco novo sem tráfego relevante.

Referência do INFO: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## 🟠 Validação final ainda NÃO VERIFICADA

- build Vite completo integrado;
- typecheck completo do produto integrado;
- QA visual em navegador;
- upload real pelo Storage API via tela;
- fluxo E2E criar → editar → mídia → publicar → site → pausar → republicar → vender unidades → vender empreendimento;
- Dashboard final com dados criados pela operação real.

O executor deste chat não materializou diretamente o repo privado e roda Node 22, enquanto o projeto declara Node 24. Portanto nenhum build/typecheck completo não executado foi marcado como aprovado.

## Estado para o usuário

🟢 O trabalho próprio de backend/domínio/RLS/RBAC/publicação/visibilidade/Storage/contratos da Frente03 está avançado e validado nos níveis descritos.

🟠 A Frente03 não recebe verde geral enquanto a branch integrada não sincronizar esses arquivos e passar build/browser/E2E real.
