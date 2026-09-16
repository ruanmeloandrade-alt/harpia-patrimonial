# Frente03 — integração do Catálogo e Dashboard

Este diretório pertence à Frente03.

## Composição atual com a Frente01

A Frente01 já possui `PlatformRuntimeProvider`, `IntegratedCatalog`, `IntegratedDashboard`, rota `/interno/catalogo` e navegação interna com permissões alternativas.

A forma preferida de integrar a Frente03 é usar um único cliente Supabase oficial através de `createCatalogRuntime`:

```tsx
import { createCatalogRuntime } from '../features/catalog';
import { requireSupabase } from '../core/supabase/client';

const catalogRuntime = createCatalogRuntime(requireSupabase());
```

O factory entrega, todos usando a mesma instância do cliente:

- `catalogRuntime.repository`;
- `catalogRuntime.publicCatalogService`;
- `catalogRuntime.mediaStorage`.

Na tela administrativa:

```tsx
<CatalogAdminPage
  repository={catalogRuntime.repository}
  mediaStorage={catalogRuntime.mediaStorage}
  access={{
    canView:
      auth.hasPermission('catalog.view')
      || auth.hasPermission('catalog.manage')
      || auth.hasPermission('catalog.publish'),
    canManage: auth.hasPermission('catalog.manage'),
    canPublish: auth.hasPermission('catalog.publish'),
  }}
/>
```

A Frente03 não cria outro cliente Supabase e não armazena segredo.

## Persistência

- `CatalogRepository`: contrato do domínio.
- `LocalCatalogRepository`: adapter transitório local, vazio por padrão.
- `SupabaseCatalogRepository`: adapter de produção que recebe o cliente oficial da Frente01.
- `catalog.schema.sql`: schema/RLS consolidado para ambiente novo.
- `catalog.public-visibility.sql`: migration incremental de visibilidade hierárquica para ambiente existente.
- `catalog.sold-integrity.sql`: migration incremental de integridade para empreendimentos vendidos.
- `catalog.storage.sql`: bucket e policies de referência para mídia.

Os adapters de catálogo emitem `harpia:catalog-changed` após mutações para atualizar consumidores no navegador.

## RBAC

- `catalog.view`: consultar catálogo interno;
- `catalog.manage`: criar, editar, duplicar, excluir logicamente e enviar/remover mídia;
- `catalog.publish`: publicar, pausar e marcar vendido.

`catalog.manage` e `catalog.publish` também permitem leitura do módulo. A UI não substitui RLS; o banco valida as ações.

A matriz real já foi testada no Supabase dedicado:

- usuário somente `catalog.manage`: cria/edita, mas não publica;
- usuário somente `catalog.publish`: lê e altera status, mas não edita conteúdo nem cria;
- usuário somente `catalog.view`: lê inclusive rascunhos internos, mas UPDATE afeta zero linhas e INSERT é bloqueado;
- cliente autenticado comum enxerga somente itens publicamente elegíveis e não ganha escrita interna.

## Máquina de estados

Transições válidas:

- `draft` → `published` ou `sold`;
- `published` → `paused` ou `sold`;
- `paused` → `published` ou `sold`;
- `sold` é terminal.

A regra existe no adapter local, no adapter Supabase e no trigger real do banco. Chamadas diretas à API não conseguem furar a regra visual.

## Regras de domínio

- todo cadastro nasce em `draft`;
- unidade exige empreendimento pai ativo e tipologia explícita;
- unidade nova ou realocada não pode ser vinculada a empreendimento vendido;
- unidade histórica que já pertence a empreendimento vendido pode continuar sendo editada para correção cadastral;
- empreendimento só pode ser marcado como vendido quando todas as unidades ativas também estiverem vendidas;
- empreendimento com unidades ativas não pode ser excluído nem convertido para outro tipo;
- duplicação de unidade é bloqueada se o empreendimento pai estiver vendido ou indisponível;
- tipologia é removida quando item deixa de ser unidade;
- código ativo é único;
- preço não pode ser negativo;
- código, nome e cidade não podem ser vazios;
- primeira foto cadastrada é a capa;
- fotos, vídeos, plantas e documentos são suportados;
- publicação, venda e exclusão preservam histórico;
- `published_at` e `sold_at` são controlados por transições no banco.

Essas regras foram testadas no Supabase real com transações revertidas após o QA.

## Visibilidade pública hierárquica

Uma unidade com `status = published` só é publicamente elegível quando seu empreendimento pai também está publicado e ativo.

Consequências:

- pausar/vender o empreendimento retira suas unidades da exposição pública sem destruir o histórico interno;
- equipe com permissão interna continua vendo pai e unidades para administração;
- `PublicCatalogService`, RLS e Dashboard usam o mesmo conceito de elegibilidade pública;
- cliente autenticado comum segue a mesma regra pública.

## Mídia / Storage

O projeto real possui o bucket público `catalog-media`.

Configuração:

- limite por arquivo: 50 MB;
- formatos: JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- URLs públicas e estáveis para uso no site;
- INSERT/SELECT operacional/UPDATE/DELETE no Storage restritos a usuários com `catalog.manage`;
- nomes de objeto opacos e únicos;
- upload usa `upsert: false`.

`SupabaseCatalogMediaStorage` fornece:

- `upload(file, type)`;
- `remove(path)`.

`CatalogAdminPage` aceita `mediaStorage`. Quando presente, mostra upload direto para fotos, vídeos, plantas e documentos; quando ausente, mantém URLs manuais como fallback.

O fluxo administrativo rastreia uploads pendentes para:

- remover um lote parcial quando o upload falha;
- limpar uploads ainda não salvos ao trocar/cancelar uma edição;
- persistir o caminho de Storage de mídia criada pelo upload interno;
- remover objetos antigos do Storage quando uma mídia interna é retirada de um cadastro salvo.

O caminho operacional de Storage não faz parte do contrato `PublicCatalogItem`; o serviço público retorna somente a mídia necessária ao consumidor.

O adapter passou typecheck estrito e teste de execução com cliente Supabase simulado em validação isolada anterior. O upload real pelo navegador ainda precisa ser validado depois que a Frente01 injetar `mediaStorage` na composição integrada.

## Catálogo público

`PublicCatalogService` expõe:

- `list(filters)`;
- `listUnits(parentId, filters)`;
- `getByIdOrCode(value)`;
- `getDevelopmentWithUnits(value)`;
- `getFilterOptions()`.

Garantias:

- somente itens publicamente elegíveis são expostos;
- unidade exige pai publicado para exposição;
- cidades/localizações/estilos vêm de dados reais;
- relação empreendimento/unidades é explícita;
- faixa de preço do empreendimento é derivada das unidades publicadas;
- filtro de preço usa preços reais das unidades;
- o preço do pai só é usado quando não há unidade publicada com preço;
- os limites globais também evitam teto artificial do pai;
- `storagePath` não é exposto pelo contrato público;
- a Frente02 deve consumir esta fonte, sem duplicar catálogo.

## Dashboard + Frente04

`CrmRepositorySnapshotSource` aceita repositório com `load()` compatível com a Frente04 e pode reagir a `harpia:crm-updated`.

Métricas objetivamente suportadas:

- leads;
- origem dos leads;
- próximas tarefas;
- demanda por região quando existe `interest.referenceId`;
- interesse por produto medido por leads/interesses referenciados.

Não inferir pelo nome configurável de etapa:

- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão.

## Valor do estoque

Quando um empreendimento possui unidades ativas, o dashboard soma as unidades e não soma novamente o preço do empreendimento. Vendidos ficam fora do estoque.

A métrica de publicados do Dashboard usa a mesma elegibilidade hierárquica do catálogo público para não contar unidade cujo pai esteja pausado/vendido.

## Estado de integração

Já resolvido:

- Supabase dedicado ativo;
- schema/RLS real do catálogo aplicado;
- grants mínimos;
- RBAC real testado;
- máquina de estados real testada;
- visibilidade pública hierárquica testada;
- integridade de empreendimento vendido testada;
- Storage/bucket real criado;
- runtime da Frente01 usando `SupabaseCatalogRepository`;
- Dashboard integrado ao repositório CRM compartilhado;
- rota `/interno/catalogo` e menu criados pela Frente01;
- experiência pública da Frente02 usando `runtime.publicCatalogService`.

Ainda requer integração/QA:

- sincronizar a cópia mais recente dos arquivos da Frente03 dentro da branch integradora;
- preferencialmente trocar a composição manual por `createCatalogRuntime(requireSupabase())`;
- expor `mediaStorage` no `PlatformRuntime` da Frente01 e passá-lo ao `IntegratedCatalog`;
- regenerar `src/core/supabase/database.types.ts`, que ainda não contém `catalog_items` na branch Frente01;
- validar upload real em navegador;
- executar build Vite e QA visual/E2E no ambiente final;
- definir semântica explícita para métricas comerciais avançadas.
