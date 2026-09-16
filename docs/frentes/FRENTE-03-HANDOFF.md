# Frente03 — Handoff de Catálogo + Dashboard

Data: 16/09/2026
Branch: `frente-03`

Legenda obrigatória:

- 🟢 completo e testável no escopo validado;
- 🟠 parcial/aguardando integração ou validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **BACKEND REAL VALIDADO / AGUARDANDO INTEGRAÇÃO GLOBAL E QA VISUAL.**

A dependência de Supabase da Frente01 foi destravada. O catálogo já existe no projeto dedicado da Hárpia, com RLS, grants, triggers e testes reais. A frente continua sem 🟢 geral porque ainda faltam montagem no shell/roteador global, tipos Supabase globais atualizados, build/browser integrado, consumo público final e storage de mídia.

## 🟢 Catálogo — domínio e regras

Implementado e validado:

- empreendimento;
- unidade de empreendimento;
- imóvel avulso;
- código, nome, finalidade, descrição e localização;
- preço e faixa derivada;
- tipologia obrigatória para unidade;
- lançamento;
- características e estilos de vida;
- incorporadora/origem;
- fotos, vídeos, plantas e documentos;
- primeira foto como capa;
- estados `draft`, `published`, `paused`, `sold`;
- timestamps de publicação/venda;
- exclusão lógica;
- código ativo único;
- unidade exige empreendimento pai ativo;
- empreendimento com unidades ativas não pode ser excluído nem convertido deixando órfãos;
- duplicação gera novo id/código e volta para rascunho.

## 🟢 Contrato público

`PublicCatalogService` expõe:

- `list(filters)`;
- `listUnits(parentId, filters)`;
- `getByIdOrCode(value)`;
- `getDevelopmentWithUnits(value)`;
- `getFilterOptions()`.

Garantias:

- somente `published` é elegível ao público;
- cidades/localizações/estilos vêm de dados reais;
- relação empreendimento/unidades é explícita;
- tipologia é exposta para unidade;
- faixa de preço do empreendimento é derivada das unidades publicadas;
- filtro de preço de empreendimento usa unidades publicadas;
- preço do pai só entra quando não existe unidade publicada com preço.

A compatibilidade estrutural com `src/features/public-catalog/front03Adapter.ts` da Frente02 já foi revisada.

## 🟢 Persistência real — Supabase

Projeto dedicado: `Harpia Patrimonial`, ref `desxomqvtjaymwwxivwq`.

Dependências da Frente01 verificadas no banco:

- `private.user_has_permission(uuid,text)`;
- `private.touch_updated_at()`;
- permissões `catalog.view`, `catalog.manage`, `catalog.publish`.

Migrations aplicadas:

- `catalog_front03`;
- `catalog_front03_grants_hardening`;
- `catalog_front03_select_policy_performance`.

Validações reais executadas:

- `anon` visualizou 2 registros publicados de QA e 0 rascunhos;
- após hardening, `anon` possui SELECT e não possui INSERT/UPDATE/DELETE;
- unidade sem tipologia foi rejeitada por `private.validate_catalog_insert()`;
- exclusão lógica de empreendimento com unidade ativa foi rejeitada por `private.protect_catalog_integrity()`;
- publicação preencheu `published_at`;
- registros temporários `QA-F03-%` foram removidos e o banco terminou com 0 registros de QA.

Advisors:

- Security Advisor: nenhum finding relacionado ao catálogo;
- há um INFO em schema privado de outra frente (`private_f05.ai_provider_credentials`), fora do escopo da Frente03;
- Performance Advisor: o warning de políticas permissivas duplicadas da Frente03 foi resolvido;
- restam apenas INFOs de índices ainda não utilizados, esperado para banco novo sem tráfego.

## 🟢 Segurança/RBAC do catálogo

- `catalog.view`: leitura interna;
- `catalog.manage`: criar, editar, duplicar e excluir logicamente;
- `catalog.publish`: publicar, pausar e marcar vendido;
- `catalog.manage`/`catalog.publish` permitem leitura interna;
- usuário publish-only não pode alterar campos comerciais;
- `published_at` e `sold_at` são controlados pelas transições de status;
- grants do Data API foram explicitamente revogados e concedidos pelo princípio do menor privilégio;
- RLS permanece a autorização por linha.

## 🟢 Dashboard — catálogo e CRM seguro

Métricas de catálogo:

- publicados;
- rascunhos;
- pausados;
- vendidos;
- valor de estoque sem dupla contagem;
- publicados por cidade;
- publicados por finalidade.

Contratos comerciais:

- `CommercialMetricsProvider`;
- `CrmSnapshotMetricsProvider`;
- `CrmRepositorySnapshotSource`.

Métricas objetivamente deriváveis:

- leads;
- origem;
- próximas tarefas;
- demanda por região quando existe `interest.referenceId` real;
- interesse por produto medido por quantidade de leads/interesses referenciados.

Não inferir por nome de etapa:

- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão.

`CrmRepositorySnapshotSource` lê `load()` compatível com o repositório da Frente04 e escuta `harpia:crm-updated`, reduzindo a dependência de compartilhar a mesma instância de `CrmService`.

## 🟠 UI / integração com Frente01

A Frente01 já entrega:

- `src/core/supabase/client.ts` com `requireSupabase()`;
- `useAuth()`/permissões;
- constantes `PERMISSIONS.CATALOG_VIEW`, `CATALOG_MANAGE`, `CATALOG_PUBLISH`;
- `InternalShell`;
- `AppRouter` protegido.

Ainda falta no produto integrado:

1. regenerar `src/core/supabase/database.types.ts` após as migrations da Frente03;
2. montar `Front03Workspace` no `AppRouter`/`InternalShell`;
3. mapear `useAuth().hasPermission()` para as 3 permissões de catálogo;
4. criar `SupabaseCatalogRepository(requireSupabase())` na composição global;
5. executar QA browser ponta a ponta.

A geração atual do Supabase já confirma que `Database` contém:

- tabela `catalog_items`;
- enum `catalog_item_kind`;
- enum `catalog_purpose`;
- enum `catalog_status`.

O arquivo `database.types.ts` existente na branch Frente01 ainda foi gerado antes da tabela de catálogo e precisa ser atualizado pela própria Frente01/integrador, pois é arquivo global de ownership dela.

## 🟠 Interface administrativa

`CatalogAdminPage` já contém:

- loading;
- erro;
- empty state;
- criação/edição/busca/filtros;
- duplicação/publicação/pausa/vendido/exclusão;
- mídia separada;
- tipologia de unidade;
- modo leitura;
- RBAC granular.

Falta somente build/browser integrado depois do merge para receber 🟢 como tela final.

## 🟠 Validações restantes

- build Vite completo no produto integrado;
- teste visual/browser no shell final;
- teste positivo com usuário interno real do grupo Administrador;
- regeneração dos tipos globais Supabase;
- consumo real pela Frente02 após integração;
- CRM real montado na mesma aplicação;
- storage/upload binário de mídia;
- métricas comerciais avançadas quando houver semântica explícita.

## Dependências atuais

### Frente01 / integrador — ALTA

- regenerar `database.types.ts`;
- montar `Front03Workspace` no shell/roteador;
- injetar cliente oficial e RBAC real.

### Frente02 / integrador — ALTA

- instanciar `PublicCatalogService` real no adapter já preparado;
- usar relação/faixa real do catálogo.

### Frente04 / integrador — MÉDIA/ALTA

- fornecer repositório/estado real do CRM para `CrmRepositorySnapshotSource`;
- definir semântica explícita para métricas avançadas se necessário.

### Infraestrutura compartilhada

- storage/upload binário real.

## Próximo passo

A Frente03 já avançou tudo o que a liberação recente da Frente01 permitiu no backend. O próximo avanço relevante depende agora da Frente01/integrador atualizar os tipos e montar a Frente03 no shell global; depois disso deve ser executado QA browser real e corrigidas eventuais regressões de integração.
