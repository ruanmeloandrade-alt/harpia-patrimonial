# Hárpia Patrimonial — Contratos entre módulos

Este documento existe para permitir que cinco frentes trabalhem em paralelo sem acoplamento indevido.

## 1. Auth / sessão

Proprietário: Frente01.

Contrato esperado:

- criar conta de cliente com nome, e-mail, WhatsApp e senha;
- login por e-mail/senha;
- sessão persistente;
- logout explícito;
- obter usuário atual;
- distinguir cliente final de usuário interno;
- verificar permissões internas.

Frentes consumidoras não devem implementar autenticação própria.

## 2. Catálogo publicado

Proprietário: Frente03.

Contrato mínimo de leitura pública:

- listar itens publicados;
- filtrar por finalidade;
- filtrar por cidade;
- filtrar por bairro/condomínio/localização;
- filtrar lançamento sim/não;
- filtrar faixa de preço;
- abrir item por id/código;
- retornar fotos, vídeos, plantas/documentos, preço, localização, características, status, tipo e tipologia quando unidade;
- informar relação empreendimento/unidade;
- derivar faixa de preço do empreendimento pelas unidades publicadas.

Implementação da Frente03:

- `CatalogRepository` é o contrato de persistência do domínio;
- `PublicCatalogService` é o contrato de leitura pública e retorna somente `published`;
- `PublicCatalogService.list(filters)` lista itens publicados;
- `PublicCatalogService.listUnits(parentId, filters)` lista unidades publicadas do empreendimento;
- `PublicCatalogService.getByIdOrCode(value)` retorna detalhe publicado;
- `PublicCatalogService.getDevelopmentWithUnits(value)` retorna empreendimento, unidades publicadas e faixa de preço real;
- `PublicCatalogService.getFilterOptions()` deriva cidades, localizações, estilos de vida e limites de preço;
- filtro de preço de empreendimento considera preços das unidades publicadas quando elas existem;
- `SupabaseCatalogRepository` é o adapter de produção preparado para receber o cliente Supabase oficial da Frente01 por injeção;
- `LocalCatalogRepository` é adapter transitório local, começa vazio e não pode ser tratado como persistência multiusuário final;
- `src/features/catalog/catalog.schema.sql` contém o schema/RLS do domínio e depende das funções/permissões definidas pela Frente01.

Frente02 consome o contrato público. Não deve duplicar banco/repositório de catálogo.

## 3. Favoritos e interesses

Proprietários: Frente01 para identidade; Frente02 para experiência; Frente03 para referência do item.

Contrato:

- somente usuário autenticado persiste favorito;
- favorito referencia usuário + item do catálogo;
- remover favorito deve ser idempotente;
- ausência de conta deve acionar cadastro/login, não armazenamento fictício.

## 4. Criação de lead pelo site

Proprietário do CRM: Frente04.

Produtores de evento: Frente02 e, quando necessário, Frente01.

Payload conceitual mínimo:

- usuário/contato quando conhecido;
- nome;
- e-mail;
- WhatsApp;
- origem;
- página/ação de origem;
- imóvel/produto/serviço relacionado;
- timestamp;
- metadados úteis de contexto.

Regra absoluta: criar lead não envia mensagem automaticamente.

## 5. CRM

Proprietário: Frente04.

Contrato funcional:

- criar/editar lead;
- consultar lead;
- listar por funil/etapa;
- mover etapa;
- atribuir responsável;
- gerir tags;
- gerir campos personalizados;
- criar tarefa/próxima ação;
- registrar histórico;
- emitir eventos de CRM para automações.

Quando um lead tiver interesse em item real do catálogo, `interest.referenceId` deve apontar para o `id` ou código real do item, sem duplicar a entidade imobiliária dentro do CRM.

## 6. Eventos para automação

Produtor principal: Frente04.
Consumidor: Frente05.

Eventos previstos:

- lead criado;
- etapa alterada;
- campo alterado;
- tag adicionada/removida;
- ausência de interação;
- tarefa/evento futuro;
- eventos adicionais extensíveis.

Os eventos não devem conter regra de negócio do bot. Eles apenas descrevem o que aconteceu.

## 7. SalesBot / automação / IA

Proprietário: Frente05.

Contrato mínimo para consumidores:

- iniciar execução de SalesBot;
- pausar execução;
- retomar quando suportado;
- consultar status;
- acionar agente IA;
- pausar agente IA;
- executar ação configurada de CRM por interface;
- registrar estado/log de execução sem inventar execução real quando integração externa não existir.

## 8. Inbox

Proprietário: Frente04.

A Inbox mantém UI e contexto operacional. Integrações de transporte real serão posteriores.

Contrato com Frente05:

- iniciar/pausar SalesBot associado a uma conversa/lead;
- acionar/pausar IA;
- consultar status desses recursos.

Contrato futuro de transporte:

- enviar texto;
- enviar áudio;
- enviar imagem;
- enviar vídeo;
- enviar documento;
- enviar formulário;
- receber eventos de mensagem.

Enquanto WhatsApp real não estiver conectado, a interface deve mostrar estado preparado/inativo, sem simular mensagens reais como se tivessem sido enviadas.

## 9. Dashboard

Proprietário visual: Frente03.
Fontes de dados: Frente03 e Frente04.

Métricas de catálogo vêm do `CatalogRepository` da Frente03.
Métricas comerciais usam `CommercialMetricsProvider`.

Contrato atual com a Frente04:

- a Frente03 pode adaptar a `snapshot()` real do CRM sem importar a implementação interna;
- `CrmSnapshotMetricsProvider` considera objetivamente disponíveis sem catálogo: quantidade de leads, origem dos leads e próximas tarefas pendentes;
- quando recebe o mesmo `CatalogRepository` e o lead possui `interest.referenceId` real, também deriva demanda por região e interesse por produto medido por quantidade de leads/interesses;
- interesse por produto não deve ser apresentado como venda, receita ou conversão por produto;
- visitas, propostas, negociações, vendas, pipeline/VGV, ticket e conversão NÃO podem ser inferidos pelo nome das etapas porque funis/etapas são configuráveis;
- métricas não suportadas permanecem em `0`/empty state e são marcadas como indisponíveis até existir contrato/configuração explícita;
- `CommercialMetricsProvider.getAvailableMetrics()` informa quais métricas a fonte realmente sustenta.

Regra de valor do estoque:

- se um empreendimento possui unidades ativas, somar as unidades e não somar novamente o preço do empreendimento pai;
- empreendimento sem unidades ativas pode usar seu próprio preço;
- itens vendidos não entram no valor de estoque.

Sem integração disponível:

- mostrar zero;
- mostrar empty state;
- nunca preencher com números fictícios.

## 10. Integrações externas

Proprietário da configuração/estrutura: Frente05.

Conexões reais posteriores:

- WhatsApp;
- Meta;
- e-mail;
- APIs adicionais.

As demais frentes devem consumir interfaces internas, nunca chaves ou SDKs externos diretamente.

## 11. Persistência e RBAC do catálogo

Proprietários envolvidos: Frente01 para Supabase/auth/RBAC global; Frente03 para domínio do catálogo.

Contrato:

- Frente03 não cria outro cliente Supabase;
- Frente01 fornece/injeta o cliente oficial do projeto Hárpia;
- Frente03 fornece `SupabaseCatalogRepository` e schema do domínio;
- schema do catálogo deve ser aplicado somente depois do `core_auth.sql` da Frente01;
- `catalog.view` permite consulta interna;
- `catalog.manage` permite criar/editar/duplicar/excluir logicamente;
- `catalog.publish` permite transições de status publicar/pausar/vendido;
- `catalog.manage` e `catalog.publish` implicam leitura do catálogo na composição da UI, coerente com RLS;
- usuário apenas com `catalog.publish` não pode alterar campos comerciais nem timestamps de publicação/venda;
- `published_at` e `sold_at` são controlados por transições de status no banco;
- RLS e trigger de banco validam as permissões; esconder botão na UI não é suficiente;
- código, nome e cidade não podem ser vazios;
- unidade exige tipologia e empreendimento pai ativo;
- exclusão de empreendimento ou mudança de tipo não pode deixar unidades ativas órfãs.

## 12. Arquivos compartilhados

Se um contrato precisar mudar:

1. registrar em `docs/STATUS-FRENTES.md`;
2. não quebrar silenciosamente a API/interface consumida por outra frente;
3. documentar migração necessária;
4. deixar o chat de integração resolver mudanças incompatíveis.
