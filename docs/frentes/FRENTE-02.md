# Frente02 — Site público e área do cliente

Branch obrigatória: `frente-02`

## Missão

Construir toda a experiência pública da Hárpia e a área pessoal do cliente final, consumindo autenticação da Frente01 e catálogo publicado da Frente03.

## Ler antes de começar

1. `AGENTS.md`
2. `docs/BRIEFING-CONSOLIDADO.md`
3. `docs/ESCOPO-DE-TRABALHO.md`
4. `docs/CONVERSA-E-DECISOES.md`
5. `docs/FRENTES-DE-TRABALHO.md`
6. `docs/CONTRATOS-ENTRE-MODULOS.md`
7. `docs/STATUS-FRENTES.md`

## Escopo exclusivo

### 1. Home pública

Entregar uma home premium alinhada ao posicionamento da Hárpia como escritório de inteligência patrimonial.

Conteúdos/áreas mínimas:

- hero;
- posicionamento institucional;
- busca de imóveis;
- acesso aos serviços;
- `Encontre pelo estilo de vida`;
- imóveis/produtos publicados;
- atendimento consultivo;
- parceria DUMU Arquitetura;
- assessoria jurídica;
- patrimônio/investimentos;
- CTAs de atendimento;
- acesso à área interna;
- login/cadastro do cliente final.

### 2. Menu público

- Sobre
- Investimentos
- Leilões
- Assessoria Jurídica
- Arquitetura
- Área Interna
- Ser Atendido Agora!

### 3. Páginas institucionais

Criar estrutura e conteúdo disponível para:

- Sobre;
- Investimentos;
- Leilões;
- Assessoria Jurídica;
- Arquitetura.

Não inventar informações não fornecidas pelo cliente. Quando faltar conteúdo, usar estrutura pronta e texto institucional já aprovado/disponível.

### 4. Busca pública de imóveis

Filtros:

- finalidade;
- cidade;
- localização/bairro/condomínio;
- lançamentos sim/não;
- faixa de preço.

Regra: cidade/localização deriva do catálogo real e não fica presa ao Rio de Janeiro.

### 5. Resultado e detalhe do imóvel

Card deve prever:

- capa;
- título;
- tipo;
- localização;
- preço;
- principais características;
- status;
- CTA de detalhes;
- salvar/favoritar.

Página de detalhe deve prever:

- galeria;
- vídeo;
- características;
- localização;
- valor;
- descrição;
- status;
- relação empreendimento/unidade quando aplicável;
- CTA de atendimento;
- favorito;
- serviços relacionados quando fizer sentido.

### 6. Estilo de vida

Criar experiência `Encontre pelo estilo de vida` preparada para consumir classificações reais do catálogo.

Não preencher com categorias falsas se o catálogo ainda não tiver dados. Pode existir o componente com empty state apropriado.

### 7. Captação de proprietário

Criar jornadas:

- Quero vender meu imóvel;
- Quero alugar meu imóvel.

Fluxo inicial:

1. CTA;
2. formulário enxuto;
3. captura de dados;
4. redirecionamento para WhatsApp com contexto;
5. atendimento manual.

Não implementar publicação self-service estilo OLX nesta fase.

### 8. Retenção de comprador

Criar pop-up/experiência de retenção para visitante que demonstra intenção de sair.

Objetivo: evitar perda de lead comprador.

Não usar pop-up CIB nesta fase.

### 9. Área do cliente final

A área é enxuta e deve conter:

- perfil;
- favoritos/salvos;
- interesses;
- histórico básico de itens/serviços relacionados quando existir dado real;
- atalhos para serviços Hárpia;
- acesso a atendimento.

Não criar portal documental complexo.

### 10. Favoritos

- visitante sem conta pode navegar;
- ao tentar favoritar/salvar, exigir login/cadastro;
- usuário autenticado consegue salvar/remover;
- favoritos persistem na conta;
- não usar localStorage como substituto definitivo do vínculo com a conta se a camada real estiver disponível.

### 11. Eventos para CRM

Quando houver cadastro/conversão relevante, preparar chamada para o contrato da Frente04 com:

- origem;
- ação/página;
- imóvel/produto/serviço;
- contato do usuário.

Criar lead não pode disparar mensagem automaticamente.

## Pastas sob responsabilidade

Preferencialmente:

- `src/features/public-site/**`
- `src/features/public-catalog/**`
- `src/features/client-area/**`
- páginas/componentes exclusivos da experiência pública.

## Não editar sem coordenação

- autenticação central;
- RBAC;
- catálogo interno;
- serviços/repositórios do catálogo;
- CRM core;
- SalesBot/automação;
- roteador raiz/global quando puder registrar apenas uma rota via mecanismo existente.

Se precisar alterar arquivo global, registrar pedido em `docs/STATUS-FRENTES.md`.

## Fora do escopo

Não construir:

- painel de catálogo administrativo;
- dashboard interno;
- CRM;
- Inbox;
- SalesBot;
- agentes IA;
- conexões reais Meta/WhatsApp.

## Dependências

- Frente01: autenticação e sessão.
- Frente03: catálogo publicado.
- Frente04: criação de lead/eventos de conversão.

Se uma dependência ainda não estiver integrada, usar contrato/interface clara e empty state, nunca dados falsos.

## Critérios de aceite

- site público navegável e responsivo;
- menu e páginas institucionais existentes;
- busca/filtros prontos para dados reais;
- detalhe de imóvel funcional quando houver dado publicado;
- cidade/localidade dinâmica;
- cadastro/login acionado em ações persistentes;
- favoritos dependem de conta;
- área do cliente enxuta e funcional;
- jornadas vender/alugar capturam dados e encaminham ao WhatsApp;
- pop-up de retenção focado comprador;
- sem imóveis/métricas inventados;
- build funciona na branch.

## Handoff obrigatório ao terminar

- **Status:** EM ANDAMENTO — backend real da Frente01 já disponível; persistência de favoritos existe no Supabase; falta montagem no `AppRouter`, atualização dos tipos centrais e QA integrado. Ainda não é correto marcar `PRONTA PARA INTEGRAÇÃO` porque build/E2E/visual do produto conjunto não foram executados.
- **Commit funcional mais recente desta rodada:** `0495b01a9befdc7319526063c5b83132aab36d3b` (`[F02] integracao: exportar conta protegida favoritos e rotas`), seguido por atualizações de documentação/status.
- **O que foi entregue:** home pública; busca rápida; páginas institucionais; catálogo/filtros/detalhe; query sanitizada/compartilhável; tipologia real; relação unidade/empreendimento; serviços relacionados; retenção; vender/alugar; área do cliente; loading/erro/retry; menu desktop/mobile; acessibilidade; metadados; adapters F01/F03/F04; pipeline CRM → WhatsApp; `Front02IntegrationShell`; `Front02ClientAccountShell`; `matchesFront02PublicRoute`; `createSupabaseFavoritesStore`; handoff detalhado em `FRENTE-02-INTEGRACAO.md`.
- **Favoritos reais:** `public.client_favorites` já existe no Supabase da Hárpia e no schema versionado da Frente01, com PK `(client_id,item_id)`, FK para `user_profiles`, FK para `catalog_items`, RLS e policies de dono. Security Advisor retornou 0 lints. Testes sem identidade (`anon` e role `authenticated`) retornaram 0 linhas. Nenhum usuário/imóvel fictício foi criado.
- **O que ficou pendente:** Frente01 regenerar `src/core/supabase/database.types.ts`; montagem de `Front02IntegrationShell` nas rotas públicas; montagem de `Front02ClientAccountShell` dentro do `ClientRoute` de `/conta`; ligação do client oficial ao adapter de favoritos; escrita/leitura real com conta de cliente; instância real do catálogo F03; instância real do CRM F04; fonte real de interesses/histórico; WhatsApp oficial; build/typecheck/E2E e visual desktop/mobile.
- **Dependências ainda não integradas:** F01 para AppRouter/client tipado/QA de Auth; F03 para catálogo real; F04 para CRM e eventual histórico/interesses; configuração final para WhatsApp.
- **Rotas/páginas adicionadas:** `/`, `/sobre`, `/investimentos`, `/leiloes`, `/assessoria-juridica`, `/arquitetura`, `/imoveis`, `/imoveis/:slug`, `/vender`, `/alugar`, `/cliente`; `/conta` continua propriedade da Frente01, mas deve renderizar `Front02ClientAccountShell` dentro do `ClientRoute`.
- **Contratos consumidos:** `Front01AuthContextPort`; `Front03PublicCatalogServicePort`; `Front04LeadConversionIngestPort`; `PublicFavoritesStorePort`; `SupabaseFavoritesClientPort`; `ClientAreaDataSourcePort`; configuração de telefone para `createWhatsAppContinuation`.
- **Validações realizadas:** schema real de favoritos inspecionado; RLS/PK/FKs conferidos; Security Advisor com 0 lints; Performance Advisor apenas com índices ainda não utilizados; `anon`/`authenticated` sem identidade sem acesso a linhas; typecheck isolado do matcher de rotas e do adapter de favoritos sem erros.
- **Riscos conhecidos:** o `database.types.ts` versionado na Frente01 está desatualizado em relação ao schema atual; escrita de favorito com conta real ainda não foi testada; nenhuma branch conjunta foi buildada; rotas globais ainda não foram montadas; qualquer regressão visual só pode ser confirmada após execução real.
- **Instruções para o chat de integração:** usar `matchesFront02PublicRoute` + `Front02IntegrationShell` para o site; preservar Auth/Internal da F01; usar `Front02ClientAccountShell` em `/conta` sob `ClientRoute`; regenerar tipos Supabase antes do build; usar `createSupabaseFavoritesStore(requireSupabase())`; injetar F03/F04 reais; manter CRM antes de WhatsApp; executar build/typecheck/E2E e teste visual antes de promover o status. Consultar `docs/frentes/FRENTE-02-INTEGRACAO.md` e `docs/frentes/FRENTE-02-STATUS.md`.
