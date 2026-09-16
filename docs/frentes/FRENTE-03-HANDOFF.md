# Frente03 — Handoff de Catálogo + Dashboard

Data: 16/09/2026
Branch: `frente-03`

Legenda obrigatória:

- 🟢 completo e testável no escopo isolado;
- 🟠 parcial/aguardando integração ou validação essencial;
- 🔴 não iniciado.

## Status geral

🟠 **AGUARDANDO INTEGRAÇÕES E VALIDAÇÃO FINAL.**

Todo bloco funcional essencial que pertence exclusivamente à Frente03 e não depende de outra frente foi implementado. A frente não recebe 🟢 geral porque o produto integrado ainda depende de Supabase real, shell/RBAC, consumo pela Frente02, fonte real do CRM no produto montado, storage e build/browser final.

Último commit funcional relevante antes deste handoff: `532f04daf04c6bede662d31ad78be3d27559d1df` (`[F03] dashboard: atualizar ao receber mudancas do CRM`).

## 🟢 Catálogo — domínio e regras

Implementado:

- empreendimento;
- unidade de empreendimento;
- imóvel avulso;
- código, nome, finalidade, descrição e localização;
- preço;
- tipologia obrigatória para unidade;
- lançamento;
- características;
- estilos de vida;
- incorporadora/origem;
- fotos, vídeos, plantas e documentos;
- primeira foto como capa;
- status `draft`, `published`, `paused`, `sold`;
- timestamps de publicação/venda;
- exclusão lógica.

Regras implementadas:

- cadastro nasce como rascunho;
- código ativo é único no adapter local e no schema de produção;
- código, nome e cidade não podem ser vazios;
- preço não pode ser negativo;
- unidade exige empreendimento pai ativo;
- unidade exige tipologia explícita;
- tipologia é removida quando item deixa de ser unidade;
- empreendimento com unidades ativas não pode ser excluído;
- empreendimento com unidades ativas não pode mudar de tipo deixando unidades órfãs;
- duplicação gera novo id/código, renova ids de mídia e volta para rascunho;
- publicação/pausa/vendido são ações explícitas.

## 🟢 Catálogo — interface administrativa

Código implementado em `CatalogAdminPage.tsx`:

- loading;
- erro;
- empty state;
- criação;
- edição;
- busca;
- filtro por status;
- filtro por tipo;
- duplicação;
- publicação;
- pausa;
- vendido;
- exclusão com confirmação;
- mídia separada em fotos, vídeos, plantas e documentos;
- IDs de mídia existentes preservados quando a URL permanece na edição;
- tipologia visível em unidades;
- modo leitura;
- RBAC separado em `catalog.view`, `catalog.manage`, `catalog.publish`;
- `catalog.manage`/`catalog.publish` também habilitam leitura, coerente com RLS.

A tela permanece 🟠 como entrega final porque o build Vite/browser integrado não pôde ser executado após as últimas mudanças no executor disponível.

## 🟢 Contrato público

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
- tipologia é exposta para unidade;
- faixa de preço do empreendimento é derivada de unidades publicadas;
- filtro de preço de empreendimento verifica os preços das unidades publicadas;
- preço do pai só é usado quando não existe unidade publicada com preço;
- limites globais de preço evitam contar preço do pai quando unidades publicadas existem.

Compatibilidade com a Frente02:

- `src/features/public-catalog/front03Adapter.ts` da branch `frente-02` foi revisado;
- `list`, `getByIdOrCode`, `getFilterOptions`, tipologia e formatos de mídia estão estruturalmente compatíveis;
- se a experiência pública precisar da faixa completa, usar `getDevelopmentWithUnits()` e não criar uma segunda regra de preço.

## 🟢 Persistência — contratos/adapters

- `CatalogRepository`: contrato único do domínio.
- `LocalCatalogRepository`: adapter transitório local, vazio por padrão.
- `SupabaseCatalogRepository`: adapter de produção por injeção do cliente oficial da Frente01.
- adapters emitem `harpia:catalog-changed` após mutações.
- adapter Supabase valida os campos básicos antes de enviar dados.

## 🟠 Supabase/RLS real

Arquivo: `src/features/catalog/catalog.schema.sql`.

Implementado no SQL:

- tabela do catálogo;
- enums;
- índices;
- unicidade de código ativo;
- campos obrigatórios;
- validação de mídia JSON array;
- unidade/pai/tipologia;
- proteção contra órfãos;
- RLS público somente para publicados;
- RLS interno;
- `catalog.view`;
- `catalog.manage`;
- `catalog.publish`;
- publish-only impedido de alterar campos comerciais;
- `published_at`/`sold_at` controlados por transições de status;
- `service_role` reconhecido para operações server-side legítimas.

Permanece 🟠 porque o projeto Supabase dedicado da Hárpia ainda não existe/foi aplicado e não houve teste RLS real.

## 🟢 Dashboard — catálogo

Métricas reais implementadas:

- publicados;
- rascunhos;
- pausados;
- vendidos;
- valor de estoque;
- publicados por cidade;
- publicados por finalidade.

Valor de estoque evita dupla contagem:

- se empreendimento tem unidades ativas, usa as unidades;
- não soma novamente o preço do pai;
- empreendimento sem unidades pode usar próprio preço;
- vendidos não entram no estoque.

## 🟢 Dashboard — CRM seguro

Contratos:

- `CommercialMetricsProvider`;
- `CrmSnapshotMetricsProvider`;
- `CrmRepositorySnapshotSource`.

Métricas objetivamente deriváveis hoje:

- leads;
- origem dos leads;
- próximas tarefas pendentes;
- demanda por região quando existe `interest.referenceId` real;
- interesse por produto em quantidade de leads/interesses quando existe referência real.

Não inferir pelo nome de etapa:

- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão.

Essas métricas permanecem indisponíveis/zeradas até contrato/configuração explícita.

`CrmRepositorySnapshotSource` aceita `load()` compatível com `BrowserCrmRepository` da Frente04, lê o estado atual a cada snapshot e escuta `harpia:crm-updated` por padrão. Assim, não é mais obrigatório compartilhar a mesma instância de `CrmService` para as métricas locais.

`DashboardPage` também assina atualizações do provider comercial quando disponíveis.

## Testes executados

🟢 Passaram em harness TypeScript isolado:

- criação de empreendimento/unidade/avulso;
- unidade sem tipologia rejeitada;
- tipologia removida fora de unidade;
- rascunho não aparece publicamente;
- publicação pública;
- relação empreendimento/unidades;
- faixa de preço `500000–700000` derivada de unidades;
- filtro `650000–750000` retornando empreendimento + unidade compatível e excluindo unidade fora da faixa;
- limites globais de preço `300000–700000` sem teto artificial do pai;
- proteção contra unidade órfã;
- duplicação segura;
- exclusão lógica;
- vendido;
- valor de estoque sem dupla contagem;
- leads/origens/tarefas;
- demanda por região;
- interesse por produto;
- disponibilidade explícita de métricas;
- `CrmRepositorySnapshotSource` carregando estado novo e reagindo a `harpia:crm-updated`;
- unsubscribe do evento comercial.

Testes anteriores também validaram estruturalmente `SupabaseCatalogRepository` com cliente Supabase simulado. As últimas mudanças nesse adapter foram validação/normalização e emissão do mesmo evento já usado pelo adapter local; Supabase real permanece não verificado.

## 🟠 Validações ainda pendentes

- build Vite completo;
- teste visual em navegador no shell final;
- RLS real no Supabase dedicado;
- RBAC real via `useAuth()` no produto integrado;
- persistência multiusuário real;
- storage/upload binário real;
- consumo real da Frente02 depois do merge;
- CRM real montado no mesmo produto;
- métricas comerciais avançadas quando a Frente04 definir semântica/configuração explícita.

### Motivo do build não verificado nesta sessão

O executor local disponível usa Node 22, enquanto o repositório exige Node `>=24 <25`; Vite/React não estão instalados no executor; clone/instalação direta ficaram bloqueados por resolução de rede. A branch também não possui script/configuração de lint. Nenhum teste não executado foi declarado como aprovado.

## Dependências restantes

### Frente01 / integrador

- criar/conectar Supabase dedicado;
- aplicar `core_auth.sql` e depois `catalog.schema.sql`;
- injetar cliente oficial no `SupabaseCatalogRepository`;
- montar `Front03Workspace` no shell;
- fornecer permissões reais `catalog.view/manage/publish`.

### Frente02 / integrador

- instanciar `PublicCatalogService` real no adapter já preparado;
- usar `getDevelopmentWithUnits()` quando precisar de faixa completa.

### Frente04 / integrador

- para adapter local, pode fornecer `BrowserCrmRepository` a `CrmRepositorySnapshotSource` sem alterar o CRM;
- na persistência final, fornecer fonte/repositório compatível com o mesmo contrato;
- definir semântica explícita se quiser liberar visitas/propostas/negociações/vendas/VGV/ticket/conversão.

### Infraestrutura compartilhada

- storage/upload binário real de mídia.

## Próximo passo

Não há novo bloco funcional essencial exclusivamente da Frente03 identificado após este pente-fino. A continuação útil exige uma das integrações acima ou ambiente capaz de executar build/browser final.
