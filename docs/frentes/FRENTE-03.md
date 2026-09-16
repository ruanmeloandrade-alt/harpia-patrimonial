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

## Handoff — bloco iniciado em 16/09/2026

- Status: EM ANDAMENTO. A estrutura funcional própria da Frente03 foi implementada, mas a frente ainda não deve ser classificada como `PRONTA PARA INTEGRAÇÃO` porque persistência compartilhada/storage, integração no shell e build completo da branch ainda precisam ser validados.
- Último commit funcional antes deste registro: `454c4f5201c4a5e1534ab9ad12ed36af2d7dba7f` (`[F03] dashboard: centralizar exports do modulo`).
- O que foi entregue:
  - modelo de domínio para empreendimento, unidade e imóvel avulso;
  - status `draft`, `published`, `paused` e `sold`;
  - interface `CatalogRepository` e adaptador local persistente sem seed/mock;
  - criação, edição, publicação explícita, pausa, venda, duplicação com novo identificador/código e exclusão lógica protegida por confirmação na UI;
  - relação de unidade com empreendimento;
  - associação de fotos, vídeos e plantas/arquivos por URL permanente;
  - `PublicCatalogService` que retorna somente itens publicados e deriva filtros a partir de dados reais;
  - `CatalogAdminPage` com empty state, busca e filtros;
  - `DashboardPage` com métricas reais do catálogo e zero/empty state para métricas comerciais não conectadas;
  - contrato `CommercialMetricsProvider` para a Frente04 fornecer métricas sem acoplamento;
  - `Front03Workspace` para a Frente01 integrar Dashboard + Catálogo sem a Frente03 editar o roteador global;
  - estilos responsivos isolados dentro das pastas da Frente03;
  - exports de módulo em `src/features/catalog/index.ts` e `src/features/dashboard/index.ts`.
- O que ficou pendente:
  - persistência de produção compartilhada (banco/backend) substituindo o adaptador `localStorage` quando a infraestrutura da Frente01 estiver definida;
  - upload binário/storage real para fotos, vídeos e arquivos; a UI atual associa URLs permanentes e não simula upload;
  - conexão do `canManage` com RBAC real da Frente01;
  - ligação do workspace ao shell/roteador raiz pela Frente01;
  - consumo do `PublicCatalogService` pela Frente02;
  - métricas comerciais reais fornecidas pela Frente04;
  - build Vite completo da branch: NÃO VERIFICADO nesta sessão;
  - teste visual em navegador real integrado ao shell: NÃO VERIFICADO nesta sessão.
- Modelo de dados criado/alterado: `CatalogItem`, `CatalogItemDraft`, `CatalogLocation`, `CatalogMedia`, `CatalogStatus`, `CatalogItemKind`, `PublicCatalogItem` e filtros públicos em `src/features/catalog/types.ts`.
- Contrato público exposto: `PublicCatalogService.list`, `getByIdOrCode` e `getFilterOptions`; a leitura parte exclusivamente de registros com status `published`.
- Métricas já reais: publicados, rascunhos, pausados, vendidos, valor de estoque não vendido com preço informado, distribuição dos publicados por cidade e por finalidade.
- Métricas aguardando CRM: leads, visitas, propostas, negociações, vendas comerciais, pipeline/VGV comercial, ticket, conversão, origem dos leads, demanda comercial por região e próximas ações.
- Testes executados: camada TypeScript de domínio/repositório/contratos foi submetida a checagem local de tipos durante a construção; inspeção final dos arquivos e da árvore da branch realizada no GitHub. Build completo, lint e teste end-to-end: NÃO VERIFICADOS.
- Riscos conhecidos: `localStorage` é um adaptador transitório por navegador e não substitui banco compartilhado; mídia por URL depende de storage permanente; branch da Frente03 não deve editar arquivos globais para forçar demonstração.
- Instruções para o chat de integração: integrar `Front03Workspace` ou, separadamente, `DashboardPage` e `CatalogAdminPage`; fornecer `canManage` pelo RBAC real; substituir/injetar `CatalogRepository` de produção quando a persistência compartilhada existir; fornecer `CommercialMetricsProvider` da Frente04; a Frente02 deve consumir o serviço público/contrato sem criar outra fonte de catálogo.
