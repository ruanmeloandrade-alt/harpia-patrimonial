# Frente03 — integração do Catálogo e Dashboard

Este diretório pertence à Frente03.

## Composição atual com a Frente01

A Frente01 já possui `PlatformRuntimeProvider`, `IntegratedCatalog`, `IntegratedDashboard`, rota `/interno/catalogo` e navegação interna com permissões alternativas.

A composição esperada usa o cliente Supabase oficial e os adapters da Frente03:

```tsx
import {
  SupabaseCatalogMediaStorage,
  SupabaseCatalogRepository,
} from '../features/catalog';
import { requireSupabase } from '../core/supabase/client';

const client = requireSupabase();
const catalogRepository = new SupabaseCatalogRepository(client);
const catalogMediaStorage = new SupabaseCatalogMediaStorage(client);
```

Na tela administrativa:

```tsx
<CatalogAdminPage
  repository={catalogRepository}
  mediaStorage={catalogMediaStorage}
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
- `catalog.schema.sql`: schema/RLS de referência do catálogo.
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
- usuário somente `catalog.view`: lê inclusive rascunhos internos, mas UPDATE afeta zero linhas e INSERT é bloqueado.

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
- empreendimento com unidades ativas não pode ser excluído nem convertido para outro tipo;
- tipologia é removida quando item deixa de ser unidade;
- código ativo é único;
- preço não pode ser negativo;
- código, nome e cidade não podem ser vazios;
- primeira foto cadastrada é a capa;
- fotos, vídeos, plantas e documentos são suportados;
- publicação, venda e exclusão preservam histórico;
- `published_at` e `sold_at` são controlados por transições no banco.

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

O adapter passou typecheck estrito e teste de execução com cliente Supabase simulado. O upload real pelo navegador ainda precisa ser validado depois que a Frente01 injetar o adapter na composição integrada.

## Catálogo público

`PublicCatalogService` expõe:

- `list(filters)`;
- `listUnits(parentId, filters)`;
- `getByIdOrCode(value)`;
- `getDevelopmentWithUnits(value)`;
- `getFilterOptions()`.

Garantias:

- somente `published` é exposto;
- cidades/localizações/estilos vêm de dados reais;
- relação empreendimento/unidades é explícita;
- faixa de preço do empreendimento é derivada das unidades publicadas;
- filtro de preço usa preços reais das unidades;
- o preço do pai só é usado quando não há unidade publicada com preço;
- os limites globais também evitam teto artificial do pai;
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

## Estado de integração

Já resolvido:

- Supabase dedicado ativo;
- schema/RLS real do catálogo aplicado;
- grants mínimos;
- RBAC real testado;
- máquina de estados real testada;
- runtime da Frente01 usando `SupabaseCatalogRepository`;
- Dashboard integrado ao repositório CRM compartilhado;
- rota `/interno/catalogo` e menu criados pela Frente01.

Ainda requer integração/QA:

- sincronizar a cópia mais recente dos arquivos da Frente03 dentro da branch integradora;
- injetar `SupabaseCatalogMediaStorage` no `IntegratedCatalog`;
- validar upload real em navegador;
- executar build Vite e QA visual/E2E no ambiente final;
- validar consumo público pela Frente02;
- definir semântica explícita para métricas comerciais avançadas.
