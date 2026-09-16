# Frente03 — Catálogo interno, publicação e dashboard

Branch obrigatória: `frente-03`

## Missão

Construir a operação interna de produtos/imóveis da Hárpia e o dashboard real, garantindo que um cadastro interno possa alimentar o catálogo público somente após publicação explícita.

## Ler antes de começar

1. `AGENTS.md`
2. `docs/BRIEFING-CONSOLIDADO.md`
3. `docs/ESCOPO-DE-TRABALHO.md`
4. `docs/CONVERSA-E-DECISOES.md`
5. `docs/FRENTES-DE-TRABALHO.md`
6. `docs/CONTRATOS-ENTRE-MODULOS.md`
7. `docs/STATUS-FRENTES.md`

## Escopo exclusivo

### 1. Catálogo administrativo

Criar área `Catálogo` para administrar:

- empreendimento/produto;
- unidades de empreendimento;
- imóvel avulso.

### 2. Campos mínimos

Estruturar suporte para:

- código;
- nome;
- tipo;
- finalidade;
- descrição;
- cidade;
- bairro/condomínio/localização;
- endereço quando necessário;
- preço/faixa de preço;
- lançamento sim/não;
- características do imóvel;
- incorporadora/origem;
- fotos;
- vídeos;
- plantas/arquivos quando aplicável;
- status;
- publicação;
- classificação/atributos usados pelo recurso `Encontre pelo estilo de vida` quando houver.

### 3. Mídia

Permitir associação de:

- foto de capa;
- galeria de fotos;
- vídeos;
- mídia por produto e, quando aplicável, por unidade.

Não armazenar segredo ou URL temporária hardcoded.

### 4. Ações obrigatórias

- criar;
- editar;
- duplicar;
- publicar;
- pausar;
- marcar como vendido;
- excluir com confirmação.

### 5. Regras de estado

- cadastro nasce sem publicação pública automática;
- `publicado` torna elegível para o catálogo público;
- `pausado` remove da exposição pública sem perder histórico;
- `vendido` preserva informação histórica e reflete o estado real;
- `excluído` deve ser uma ação protegida e não pode acontecer sem confirmação;
- duplicação não deve clonar identificadores únicos de forma inválida.

### 6. Relação empreendimento/unidades

Um produto pode conter unidades.

Cada unidade deve poder ter, no mínimo:

- identificação/código;
- tipologia;
- preço;
- status;
- dados específicos;
- mídia própria quando necessário.

Também deve ser possível cadastrar imóvel sem empreendimento pai.

### 7. Contrato de leitura pública

Expor camada clara para Frente02 consumir somente itens publicados.

Deve permitir:

- listagem;
- filtros;
- detalhe;
- cidades/localizações derivadas dos dados reais;
- relação produto/unidade;
- status;
- mídias.

### 8. Dashboard interno

Criar dashboard com métricas alimentadas exclusivamente por dados reais.

Métricas previstas:

- produtos/imóveis ativos;
- leads;
- visitas;
- propostas;
- negociações;
- vendas;
- VGV/pipeline;
- ticket;
- conversão;
- origem dos leads;
- performance por produto;
- demanda por região;
- agenda/próximas ações.

Nem todas as métricas dependem desta frente. Métricas CRM devem consumir dados da Frente04 quando integradas.

### 9. Regra de zero mocks

Enquanto não houver dado:

- mostrar `0`;
- mostrar lista vazia;
- usar empty state;
- nunca preencher dashboard com números demonstrativos fingindo serem reais.

## Pastas sob responsabilidade

Preferencialmente:

- `src/features/catalog/**`
- `src/features/dashboard/**`
- tipos/serviços/repositórios específicos do domínio imobiliário e mídia do catálogo.

## Não editar sem coordenação

- auth/RBAC;
- site público;
- CRM;
- Inbox;
- SalesBot;
- automações;
- agentes IA;
- arquivos globais pertencentes à Frente01.

## Dependências

- Frente01: autenticação/permissão para proteger administração.
- Frente02: consumidora do catálogo publicado.
- Frente04: fonte das métricas comerciais do dashboard.

Se Frente04 ainda não estiver integrada, exibir zeros/empty states para métricas CRM.

## Fora do escopo

Não cadastrar imóveis reais nesta fase.
Não inventar estoque para apresentação.
Não implementar CRM.
Não implementar SalesBot.
Não conectar Meta ou WhatsApp.

## Critérios de aceite

- administrador autorizado consegue acessar catálogo;
- é possível criar empreendimento/produto;
- é possível criar unidades;
- é possível criar imóvel avulso;
- fotos e vídeos estão contemplados;
- publicar é ação explícita;
- pausar/vendido/duplicar/excluir funcionam de forma coerente;
- catálogo público pode consumir somente publicados;
- filtros podem ser derivados dos dados reais;
- dashboard não contém números fictícios;
- estados vazios são claros;
- build funciona na branch.

## Handoff — atualizado em 16/09/2026

Legenda obrigatória: 🟢 completo e testável | 🟠 parcial/em andamento | 🔴 não iniciado.

- Status geral: 🟠 **PARCIAL / EM ANDAMENTO**. A camada funcional própria da Frente03 avançou e já possui blocos validados, mas a frente ainda não é `PRONTA PARA INTEGRAÇÃO` porque faltam build Vite completo, teste visual integrado, persistência compartilhada/storage e integrações obrigatórias com outras frentes.
- Último commit funcional relevante: `aa0e1fc66248e58343393a7b8bec49163b4d7528` (`[F03] catalogo: proteger integridade entre empreendimentos e unidades`).
- Último commit de status/handoff antes deste registro: `95a401ee0846c107d9da9dac5fd6254cd6168586`.

### Estado por bloco

- 🟢 **Modelo de domínio do catálogo** — empreendimento, unidade, imóvel avulso, finalidade, localização, preço, lançamento, características, estilo de vida, incorporadora/origem, mídia e estados.
- 🟢 **Repositório/contrato do catálogo** — CRUD, busca, filtros internos, publicação explícita, pausa, vendido, duplicação segura e exclusão lógica.
- 🟢 **Integridade empreendimento/unidades** — criação de unidade exige empreendimento válido; empreendimento com unidades ativas não pode ser excluído nem convertido para outro tipo deixando unidades órfãs.
- 🟢 **Contrato de leitura pública** — `PublicCatalogService` expõe somente itens publicados, detalhe por id/código, filtros e opções de cidade/localização derivadas dos dados reais.
- 🟢 **Serviço de dashboard de catálogo** — métricas derivadas do repositório real e fallback comercial zerado quando CRM não está conectado.
- 🟠 **CatalogAdminPage** — implementada com formulário, edição, busca, filtros, ações e empty states; typecheck TSX isolado passou, mas build Vite real e teste visual no shell ainda não foram executados.
- 🟠 **DashboardPage** — implementada com métricas do catálogo, estado de CRM não conectado e empty states; typecheck TSX isolado passou, mas build Vite real e teste visual no shell ainda não foram executados.
- 🟠 **Front03Workspace** — Dashboard + Catálogo desacoplados e prontos para encaixe; integração real depende do shell/roteador da Frente01.
- 🟠 **Persistência de produção** — interface `CatalogRepository` permite substituição; adaptador atual usa `localStorage` e não é a persistência compartilhada final.
- 🟠 **Mídia** — associação de fotos, vídeos e plantas/arquivos por URL permanente está pronta; upload/storage binário real ainda depende da infraestrutura compartilhada.
- 🟠 **Métricas comerciais** — `CommercialMetricsProvider` está definido; dados reais dependem da Frente04.

### Testes realmente executados

- 🟢 Typecheck estrito da camada central (`types.ts`, `catalogRepository.ts`, `publicCatalog.ts`, `dashboardService.ts`): **PASSOU**.
- 🟢 Teste de execução de criação de empreendimento, unidade e imóvel avulso: **PASSOU**.
- 🟢 Confirmação de que rascunhos não aparecem no catálogo público: **PASSOU**.
- 🟢 Publicação e leitura pública somente de publicados: **PASSOU**.
- 🟢 Filtros públicos por cidade e finalidade e opções derivadas dos dados reais: **PASSOU**.
- 🟢 Dashboard com contagem real do catálogo e métricas comerciais zeradas sem CRM: **PASSOU**.
- 🟢 Duplicação gerando novo id, novo código e status rascunho: **PASSOU**.
- 🟢 Bloqueio de exclusão de empreendimento com unidades ativas: **PASSOU**.
- 🟢 Bloqueio de alteração de tipo de empreendimento que deixaria unidade órfã: **PASSOU**.
- 🟢 Exclusão lógica de unidade e posterior exclusão válida do empreendimento: **PASSOU**.
- 🟢 Marcação de vendido e reflexo nas métricas: **PASSOU**.
- 🟢 Typecheck isolado dos componentes React/TSX da Frente03 com seus contratos: **PASSOU**.

### Ainda não verificado

- 🟠 Build Vite completo da branch: **NÃO VERIFICADO**.
- 🟠 Lint global: **NÃO VERIFICADO** porque o projeto não possui script/configuração de lint disponível nesta branch.
- 🟠 Teste visual em navegador real integrado ao shell: **NÃO VERIFICADO**.
- 🟠 Integração do `canManage` com RBAC real da Frente01: **NÃO VERIFICADO**.
- 🟠 Persistência compartilhada/backend: **NÃO VERIFICADO**.
- 🟠 Storage/upload real de mídia: **NÃO VERIFICADO**.
- 🟠 Consumo real pela Frente02: **NÃO VERIFICADO**.
- 🟠 Métricas reais da Frente04: **NÃO VERIFICADO**.

### Modelo de dados e contratos

- Modelo de dados: `CatalogItem`, `CatalogItemDraft`, `CatalogLocation`, `CatalogMedia`, `CatalogStatus`, `CatalogItemKind`, `PublicCatalogItem` e filtros públicos em `src/features/catalog/types.ts`.
- Contrato público: `PublicCatalogService.list`, `getByIdOrCode` e `getFilterOptions`.
- Contrato de dashboard comercial: `CommercialMetricsProvider`.
- Contrato para persistência substituível: `CatalogRepository`.

### Riscos conhecidos

- `localStorage` é adaptador transitório por navegador e não substitui banco compartilhado.
- mídia por URL depende de storage permanente.
- a Frente03 não deve editar roteador, providers, `package.json` ou CSS global para forçar integração.

### Instruções para integração

- Frente01 deve integrar `Front03Workspace` ou, separadamente, `DashboardPage` e `CatalogAdminPage`, fornecendo RBAC real e roteamento.
- A persistência final deve implementar `CatalogRepository` sem alterar o contrato dos consumidores.
- Frente02 deve consumir `PublicCatalogService`/contrato equivalente, sem criar segunda fonte de catálogo.
- Frente04 deve fornecer `CommercialMetricsProvider` para alimentar métricas comerciais reais.
