# Frente03 — integração do Catálogo e Dashboard

Este diretório pertence à Frente03.

## Ponto visual recomendado

```tsx
import { Front03Workspace, SupabaseCatalogRepository } from './features/catalog';
import { CrmSnapshotMetricsProvider } from './features/dashboard';
import { requireSupabase } from './core/supabase/client';
import { useAuth } from './core/auth/AuthProvider';

const auth = useAuth();
const catalogRepository = new SupabaseCatalogRepository(requireSupabase());
const commercialProvider = crmService
  ? new CrmSnapshotMetricsProvider(crmService)
  : undefined;

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

O exemplo acima é de integração. A Frente03 não deve mover `requireSupabase`, `useAuth` ou o roteamento global para dentro deste módulo.

## Persistência

- `CatalogRepository`: contrato do domínio.
- `LocalCatalogRepository`: adapter transitório local, vazio por padrão.
- `SupabaseCatalogRepository`: adapter de produção que recebe o cliente oficial da Frente01.
- `catalog.schema.sql`: schema/RLS do catálogo; aplicar após `core_auth.sql` da Frente01.

Não criar outro cliente Supabase e não inserir credenciais neste módulo.

## RBAC

A UI e o schema tratam permissões separadamente:

- `catalog.view`: consultar catálogo interno;
- `catalog.manage`: criar, editar, duplicar e excluir logicamente;
- `catalog.publish`: publicar, pausar e marcar vendido.

A UI não substitui RLS. O banco também deve validar as ações.

## Catálogo público

A Frente02 deve consumir `PublicCatalogService` ou o contrato equivalente do repositório integrado.

Regras:

- somente status `published` é elegível para exposição pública;
- cidades/localizações/filtros vêm dos dados realmente cadastrados;
- não manter segunda base de imóveis no site público.

## Dashboard + Frente04

`CrmSnapshotMetricsProvider` aceita estruturalmente um objeto com `snapshot()`, como o `CrmService` da Frente04.

Hoje é seguro derivar do CRM:

- quantidade de leads;
- origem dos leads;
- próximas tarefas pendentes.

Não inferir automaticamente pelo nome das etapas:

- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão.

Essas métricas permanecem indisponíveis/zeradas até existir configuração ou contrato explícito.

## Dependência de integração com Frente04

A implementação atual de `Front04Workspace` cria o próprio `CrmService` internamente. Para o dashboard compartilhar a mesma instância em memória, o integrador deve preferir uma composição em que a instância do CRM seja criada no nível comum e fornecida tanto à Frente04 quanto ao `CrmSnapshotMetricsProvider`, ou usar o adapter de persistência compartilhada como fonte comum.

Não duplicar dados do CRM dentro da Frente03.
