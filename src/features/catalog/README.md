# Frente03 — integração do Catálogo e Dashboard

Este diretório pertence à Frente03.

## Ponto visual recomendado

```tsx
import { Front03Workspace, SupabaseCatalogRepository } from './features/catalog';
import {
  CrmRepositorySnapshotSource,
  CrmSnapshotMetricsProvider,
} from './features/dashboard';
import { BrowserCrmRepository } from './features/crm';
import { requireSupabase } from './core/supabase/client';
import { useAuth } from './core/auth/AuthProvider';

const auth = useAuth();
const catalogRepository = new SupabaseCatalogRepository(requireSupabase());

// Enquanto a Frente04 usar BrowserCrmRepository, outra instância do repositório
// lê o mesmo storage e carrega o estado atual a cada snapshot.
const crmMetricSource = new CrmRepositorySnapshotSource(new BrowserCrmRepository());
const commercialProvider = new CrmSnapshotMetricsProvider(crmMetricSource, catalogRepository);

<Front03Workspace
  catalogAccess={{
    canView: auth.hasPermission('catalog.view'),
    canManage: auth.hasPermission('catalog.manage'),
    canPublish: auth.hasPermission('catalog.publish'),
  }}
  catalogRepository={catalogRepository}
  commercialProvider={commercialProvider}
/>
```

O exemplo acima é de integração. A Frente03 não deve mover `requireSupabase`, `useAuth`, `BrowserCrmRepository` ou o roteamento global para dentro deste módulo.

## Persistência

- `CatalogRepository`: contrato do domínio.
- `LocalCatalogRepository`: adapter transitório local, vazio por padrão.
- `SupabaseCatalogRepository`: adapter de produção que recebe o cliente oficial da Frente01.
- `catalog.schema.sql`: schema/RLS do catálogo; aplicar após `core_auth.sql` da Frente01.

Os dois adapters seguem o mesmo contrato e disparam `harpia:catalog-changed` depois de mutações para manter telas consumidoras sincronizadas no mesmo navegador.

Não criar outro cliente Supabase e não inserir credenciais neste módulo.

## RBAC

A UI e o schema tratam permissões separadamente:

- `catalog.view`: consultar catálogo interno;
- `catalog.manage`: criar, editar, duplicar e excluir logicamente;
- `catalog.publish`: publicar, pausar e marcar vendido.

`catalog.manage` e `catalog.publish` também implicam capacidade de leitura dentro da tela, coerente com o RLS. A UI não substitui RLS: o banco também valida as ações.

## Regras de domínio

- todo cadastro nasce em `draft`;
- unidade exige empreendimento pai ativo e tipologia explícita;
- empreendimento com unidades ativas não pode ser excluído nem convertido para outro tipo;
- tipologia é removida quando um item deixa de ser unidade;
- código ativo é único;
- preço não pode ser negativo;
- código, nome e cidade não podem ser vazios;
- primeira foto cadastrada é a capa;
- fotos, vídeos, plantas e documentos são suportados como mídia;
- publicação, venda e exclusão preservam histórico por status/timestamps/exclusão lógica;
- `published_at` e `sold_at` são controlados por transições de status no banco para usuários autenticados.

## Catálogo público

A Frente02 deve consumir `PublicCatalogService` ou o contrato equivalente do repositório integrado.

API preparada:

- `list(filters)` — somente itens publicados;
- `listUnits(parentId, filters)` — unidades publicadas de um empreendimento;
- `getByIdOrCode(value)` — detalhe publicado;
- `getDevelopmentWithUnits(value)` — empreendimento + unidades publicadas + faixa de preço real;
- `getFilterOptions()` — cidades, localizações, estilos de vida e limites de preço derivados dos dados publicados.

Regras:

- somente status `published` é elegível para exposição pública;
- cidades/localizações/filtros vêm dos dados realmente cadastrados;
- filtro de preço de um empreendimento considera os preços das unidades publicadas; o preço do pai só é usado quando não há unidade publicada com preço;
- a faixa de preço do empreendimento é derivada das unidades publicadas, evitando duplicação de fonte de verdade;
- os limites globais de preço também ignoram o preço do pai quando existem unidades publicadas, evitando teto artificial;
- o adapter `front03Adapter.ts` já existente na Frente02 é estruturalmente compatível com `list`, `getByIdOrCode`, `getFilterOptions`, tipologia e mídia;
- se a experiência pública precisar exibir a faixa completa de um empreendimento, deve consumir `getDevelopmentWithUnits()` em vez de criar cálculo paralelo;
- não manter segunda base de imóveis no site público.

## Dashboard + Frente04

`CrmSnapshotMetricsProvider` aceita qualquer fonte estrutural com `snapshot()`.

Também existe `CrmRepositorySnapshotSource`, que aceita um repositório com `load()` compatível com a Frente04. Isso permite ler o estado mais recente sem depender da mesma instância de `CrmService`.

No adapter transitório atual da Frente04, `BrowserCrmRepository` dispara `harpia:crm-updated`. `CrmRepositorySnapshotSource` escuta esse evento por padrão e `DashboardPage` recarrega as métricas automaticamente. Um adapter de produção pode fornecer a própria fonte/assinatura sem mudar o contrato visual.

Sem catálogo injetado, é seguro derivar do CRM:

- quantidade de leads;
- origem dos leads;
- próximas tarefas pendentes.

Com o mesmo `CatalogRepository` injetado e `Lead.interest.referenceId` real, também é seguro derivar:

- demanda por região do imóvel referenciado;
- interesse por produto medido por quantidade de leads/interesses referenciados.

Esse último indicador não é venda/conversão por produto; é explicitamente um sinal de interesse baseado em leads.

Não inferir automaticamente pelo nome das etapas:

- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão.

Essas métricas permanecem indisponíveis/zeradas até existir configuração ou contrato explícito.

## Valor do estoque

O dashboard evita dupla contagem: quando um empreendimento possui unidades ativas, o valor de estoque considera as unidades e não soma novamente o preço do empreendimento pai. Empreendimento sem unidades pode usar seu próprio preço.

## Dependência de integração com Frente04

Para a persistência local transitória, o dashboard já pode consumir uma nova instância de `BrowserCrmRepository` através de `CrmRepositorySnapshotSource`, porque o estado real é lido do storage a cada snapshot.

Quando a Frente04 migrar para persistência multiusuário/backend, o integrador deve fornecer um repositório/fonte que continue expondo `load()`/`snapshot()` e, quando aplicável, assinatura de mudanças. Não duplicar dados do CRM dentro da Frente03.

## Pendências externas da Frente03

- aplicar e validar `catalog.schema.sql` no Supabase dedicado real;
- injetar cliente Supabase oficial e permissões reais pela Frente01;
- conectar `Front03Workspace` ao shell/roteador da Frente01;
- consumir o contrato público na Frente02;
- montar a fonte real de CRM da Frente04 no produto integrado;
- conectar storage/upload binário real quando a infraestrutura comum estiver pronta.
