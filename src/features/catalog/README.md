# Frente03 — integração do Catálogo e Dashboard

Este diretório pertence à Frente03.

## Composição preferida com a Frente01

A Frente01 já possui `PlatformRuntimeProvider`, `IntegratedCatalog`, `IntegratedDashboard`, rota `/interno/catalogo` e navegação interna com permissões alternativas.

Use um único cliente Supabase oficial através de `createCatalogRuntime`:

```tsx
import { createCatalogRuntime } from '../features/catalog';
import { requireSupabase } from '../core/supabase/client';

const catalogRuntime = createCatalogRuntime(requireSupabase());
```

O factory entrega:

- `catalogRuntime.repository` — Supabase + Realtime para a área interna;
- `catalogRuntime.publicCatalogService` — repositório base, sem abrir Realtime para visitante público;
- `catalogRuntime.mediaStorage` — upload/remoção com proteção de referências compartilhadas;
- `catalogRuntime.dispose()` — encerra o canal Realtime interno.

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

## Persistência e migrations

- `CatalogRepository`: contrato do domínio;
- `LocalCatalogRepository`: adapter transitório local, vazio por padrão;
- `SupabaseCatalogRepository`: persistência de produção;
- `RealtimeCatalogRepository`: decorator interno para sincronização entre sessões;
- `catalog.schema.sql`: schema/RLS consolidado para ambiente novo;
- `catalog.public-visibility.sql`: visibilidade hierárquica incremental;
- `catalog.sold-integrity.sql`: integridade de empreendimento vendido;
- `catalog.storage.sql`: bucket/policies;
- `catalog.realtime.sql`: publication `supabase_realtime`;
- `catalog.media-validation.sql`: validação server-side do payload de mídia.

## RBAC

- `catalog.view`: consultar catálogo interno;
- `catalog.manage`: criar, editar, duplicar, excluir logicamente e gerir mídia;
- `catalog.publish`: publicar, pausar e marcar vendido.

`catalog.manage` e `catalog.publish` também permitem leitura. A UI não substitui RLS; o banco valida as ações.

Matriz real já testada:

- somente `catalog.manage`: cria/edita, não publica;
- somente `catalog.publish`: lê e muda status, não cria/edita conteúdo;
- somente `catalog.view`: lê rascunhos internos, não grava;
- cliente autenticado comum: apenas superfície pública.

## Máquina de estados

- `draft` → `published` ou `sold`;
- `published` → `paused` ou `sold`;
- `paused` → `published` ou `sold`;
- `sold` é terminal.

A regra existe no local, adapter Supabase e trigger real.

## Regras de domínio

- cadastro nasce em `draft`;
- unidade exige empreendimento ativo e tipologia;
- unidade nova/realocada não pode apontar para empreendimento vendido;
- unidade histórica sob pai vendido permanece editável para correção;
- empreendimento só pode ser vendido depois de todas as unidades ativas estarem vendidas;
- empreendimento com unidades ativas não pode ser excluído/convertido deixando órfãos;
- duplicação de unidade é bloqueada quando o pai estiver vendido/indisponível;
- tipologia é removida quando o item deixa de ser unidade;
- código ativo é único;
- preço não pode ser negativo;
- código, nome e cidade não podem ser vazios;
- primeira foto é a capa;
- publicação, venda e exclusão preservam histórico;
- `published_at`/`sold_at` são controlados pelo banco.

## Visibilidade pública hierárquica

Unidade `published` só é publicamente elegível se o empreendimento pai também estiver `published` e ativo.

Consequências:

- pausar/vender pai esconde unidades sem apagar histórico;
- equipe interna continua vendo os registros;
- RLS, `PublicCatalogService` e Dashboard usam o mesmo critério;
- Dashboard separa `active` de `hiddenPublished`.

## Realtime

`catalog_items` pertence à publication `supabase_realtime`.

`RealtimeCatalogRepository`:

- escuta `INSERT/UPDATE/DELETE` de `catalog_items`;
- converte mudanças remotas em `harpia:catalog-changed`;
- só abre canal quando o repositório interno é utilizado;
- não é usado pelo `PublicCatalogService` público;
- possui `dispose()` para remover o canal.

Testes isolados executados:

- `REALTIME_CATALOG_RUNTIME_OK`;
- `REALTIME_CATALOG_LAZY_OK`.

## Mídia / Storage

Bucket real: `catalog-media`.

- limite 50 MB;
- JPEG, PNG, WebP, GIF, MP4, WebM e PDF;
- serving público;
- gestão protegida por `catalog.manage`;
- nomes opacos e `upsert:false`.

`SupabaseCatalogMediaStorage` fornece:

- `upload(file, type)`;
- `remove(path)`.

Hardening do payload:

- URL manual deve usar HTTP(S);
- tipos válidos: `image`, `video`, `document`, `floorplan`;
- validação existe em domínio, adapter Supabase e trigger SQL;
- leitura do adapter descarta mídia inválida antiga em vez de expor payload inseguro.

Lifecycle:

- lote parcial é limpo se upload falha;
- uploads não salvos são limpos em troca/cancelamento;
- `storagePath` é persistido apenas para gestão interna;
- `storagePath` não faz parte de `PublicCatalogItem`;
- ao remover mídia persistida, o Storage consulta todo o catálogo com histórico;
- o objeto só é apagado se nenhum item ainda referenciar o mesmo `storagePath` ou URL;
- duplicatas podem compartilhar mídia sem quebrar umas às outras.

Testes isolados:

- `CATALOG_MEDIA_VALIDATION_OK`;
- `MEDIA_REFERENCE_GUARD_OK`.

QA SQL real confirmou URL insegura/tipo inválido bloqueados e HTTPS válido aceito.

## Catálogo público

`PublicCatalogService`:

- `list(filters)`;
- `listUnits(parentId, filters)`;
- `getByIdOrCode(value)`;
- `getDevelopmentWithUnits(value)`;
- `getFilterOptions()`.

Garantias:

- somente publicamente elegíveis;
- relação empreendimento/unidade;
- faixa de preço derivada das unidades publicadas;
- filtros/opções derivados de dados reais;
- preço do pai apenas como fallback;
- nenhum `storagePath` público.

## Dashboard + Frente04

Patrimonial:

- publicados/elegíveis;
- publicados ocultos;
- rascunhos, pausados e vendidos;
- estoque sem dupla contagem;
- cidade e finalidade.

CRM objetivo:

- leads;
- origem;
- próximas tarefas;
- demanda regional quando existe `interest.referenceId`;
- interesse por produto.

Não inferir por nome configurável de etapa: visitas, propostas, negociações, vendas, VGV, ticket e conversão.

## Estado de integração

Já resolvido:

- Supabase dedicado;
- schema/RLS e 9 migrations Frente03 aplicadas;
- RBAC real testado;
- máquina de estados;
- visibilidade hierárquica;
- integridade de empreendimento vendido;
- bucket/Storage;
- Realtime do catálogo habilitado;
- validação server-side de mídia;
- rota/menu internos da Frente01;
- catálogo público compartilhado com Frente02;
- CRM compartilhado com Dashboard.

Ainda requer integração/QA:

- sincronizar os arquivos atuais da Frente03 na branch integradora;
- adotar `createCatalogRuntime(requireSupabase())`;
- expor `mediaStorage` no runtime global;
- chamar `catalogRuntime.dispose()` no ciclo de vida global;
- regenerar/conferir `src/core/supabase/database.types.ts`;
- rodar typecheck/build integrado;
- validar upload real e Realtime entre dois navegadores;
- executar QA visual/E2E final.
