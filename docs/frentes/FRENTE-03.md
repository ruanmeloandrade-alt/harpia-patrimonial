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

## Handoff obrigatório ao terminar

- Status:
- Commit final:
- O que foi entregue:
- O que ficou pendente:
- Modelo de dados criado/alterado:
- Contrato público exposto:
- Métricas já reais:
- Métricas aguardando CRM:
- Riscos conhecidos:
- Instruções para o chat de integração:
