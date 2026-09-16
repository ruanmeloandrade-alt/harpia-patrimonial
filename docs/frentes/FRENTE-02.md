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

- **Status atual:** EM ANDAMENTO — a Frente02 está estruturalmente integrada ao produto pela Frente01 e o QA estático próprio foi aprofundado. Ainda não é correto marcar `PRONTA` ou `INTEGRADA FINAL` porque os hardenings recentes da F2 ainda precisam de sync na F1 e build/browser/E2E com dados reais continuam não verificados.
- **Head funcional observado nesta rodada:** `77811a927f41b91ccada36c5c008958d776b908f`, seguido por atualizações documentais. Consultar sempre a head atual da branch antes de integrar.
- **O que foi entregue:** home pública; páginas institucionais; menu desktop/mobile; busca rápida; filtros sanitizados/compartilháveis; cidade→localização real na busca da home; tipologia; relação unidade/empreendimento; defesa contra unidade órfã; faixa de preço coerente; lookup público case-insensitive de fallback; catálogo/detalhe; estilo de vida; vender/alugar; retenção; área do cliente; favoritos; loading/erro/retry; acessibilidade/metadados/404; adapters F01/F03/F04; `Front02IntegrationShell`; pipeline CRM→WhatsApp; Error Boundary público; degradação segura do WhatsApp.
- **Privacidade e concorrência:** dados pessoais só carregam para cliente ativo; interesses/histórico e favoritos da conta anterior ficam ocultos imediatamente na troca de identidade; respostas assíncronas antigas são descartadas; mutações de favoritos são serializadas por cliente+imóvel; reload antigo não sobrescreve mutação concluída; erro de favorito é visível também fora da área da conta.
- **Conversão pública:** nome + WhatsApp são obrigatórios; metadata de identidade é removida pela F2; CRM conclui antes do WhatsApp; uma falha posterior somente no redirecionamento/callback externo não transforma um lead já aceito em falso erro; mensagem contextual do WhatsApp é normalizada antes de montar a URL.
- **Integração já existente:** a Frente01 já monta a experiência pública no `AppRouter`, fornece Auth/sessão, `SupabaseCatalogRepository`, store de favoritos e Edge Functions; `database.types.ts` já foi regenerado com `catalog_items` e `client_favorites`; F3 e F4 permanecem compatíveis com os ports consumidos pela F2.
- **Delta atual F02→F01:** a comparação mais recente aponta 12 arquivos funcionais próprios com diferenças: `useClientAreaData.ts`, `contracts.ts`, `front03Adapter.ts`, `Front02IntegrationShell.tsx`, `HomeCatalogSearch.tsx`, `PublicExperience.tsx`, `PublicExperienceBoundary.tsx`, `catalogQuery.ts`, `conversionPipeline.ts`, `front04ConversionAdapter.ts`, `usePublicFavoritesBridge.ts` e `whatsappContinuation.ts`.
- **Pendências externas centrais:** F1 sincronizar os 12 deltas; alinhar `SupabaseFavoritesStore.add()` ao RLS sem depender de UPDATE desnecessário; endurecer `public-lead-ingest` para derivar identidade server-side em vez de confiar em metadata do caller; manter F3 atual/realtime sincronizada na integração; disponibilizar dados operacionais reais (cliente, item publicado, atendimento/lead e telefone oficial).
- **Validações já realizadas:** contratos atuais F3/F4 conferidos e compatíveis; schema/RLS de favoritos conferidos anteriormente; `anon` e papel autenticado sem identidade sem acesso a favoritos; backend real mantido vazio quando não há dados; nenhuma entidade fictícia criada para forçar teste.
- **NÃO VERIFICADO:** build/typecheck integrado no Node exigido (`>=24 <25`), navegador desktop/mobile, E2E Auth→catálogo→favorito→lead→área do cliente→WhatsApp, escrita real de favorito com conta operacional, detalhe com item operacional e histórico/interesses com atendimento real.
- **Instruções para integração/primeira entrega:** usar os contratos/ports existentes, sincronizar apenas os arquivos F2 listados no semáforo atual, preservar ownership F1/F3/F4, executar build/typecheck no ambiente correto e só promover os laranjas/vermelhos após teste real. Ver `docs/frentes/FRENTE-02-STATUS.md`, `docs/frentes/FRENTE-02-ENTREGA-01.md` e `docs/frentes/FRENTE-02-INTEGRACAO.md`.
