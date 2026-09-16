# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: EM ANDAMENTO — BLOQUEIOS DA F01 REDUZIDOS; AGUARDANDO MONTAGEM/QA INTEGRADO

## Legenda

- 🟢 CONCLUÍDO: implementado e validado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: há implementação real, mas falta montagem, dado real, teste ou integração obrigatória.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada ou requisito final depende do produto integrado.

## Escopo e andamento

| Status | Item do escopo | Estado atual |
|---|---|---|
| 🟢 | Home pública | Hero, posicionamento, serviços, catálogo, estilo de vida, DUMU, jurídico, atendimento e captação estruturados. |
| 🟢 | Busca rápida na home | Finalidade, cidade, localização e estilo de vida usam opções reais do catálogo e levam filtros para a URL. |
| 🟢 | Menu desktop/mobile | Navegação pública, Minha conta, área do cliente, vender/alugar e Área Interna estruturadas. |
| 🟢 | Sincronização com roteador | `history.pushState`/`replaceState` sincronizados com a navegação global. |
| 🟢 | Matcher para AppRouter | `matchesFront02PublicRoute(pathname)` cobre rotas estáticas e `/imoveis/:slug` sem duplicar lógica na Frente01. |
| 🟢 | 404 pública | Rota pública inválida recebe fallback próprio. |
| 🟢 | Metadados por rota | `document.title` e meta description atualizados por página. |
| 🟢 | Acessibilidade de overlays | Foco, Escape, `aria-*` e scroll lock em menu, captura e retenção. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Assessoria Jurídica e Arquitetura sem conteúdo fictício. |
| 🟢 | Entrypoint/handoff | `index.ts` expõe experiência, shells, contratos, adapters, hooks, pipeline e matcher de rotas. |
| 🟢 | Shell único de integração | `Front02IntegrationShell` recebe ports reais das outras frentes e compõe Auth, catálogo, CRM, favoritos, dados do cliente e WhatsApp sem duplicar domínio. |
| 🟢 | Shell protegido da conta | `Front02ClientAccountShell` preparado para ser montado dentro do `ClientRoute` da Frente01 em `/conta`. |
| 🟢 | Contrato público do catálogo | Itens, mídia, filtros, estilo de vida e opções globais definidos. |
| 🟢 | Adapter Frente03 | Contrato real da Frente03 adaptado sem duplicar domínio. |
| 🟢 | Tipologia real | `typology` da Frente03 é usada como tipo público quando disponível; fallback continua honesto por `kind`. |
| 🟢 | Empreendimento/unidade | Unidade resolve `parentId` pelo serviço real e exibe nome do empreendimento-pai quando publicado. |
| 🟠 | Catálogo com dados reais no produto integrado | UI e adapter prontos; falta instanciar o serviço real após merge. |
| 🟢 | Filtros completos | Finalidade, cidade, localização, lançamento, preço e estilo de vida implementados. |
| 🟢 | Sanitização de filtros | Query inválida é normalizada; números negativos/NaN e lançamento inválido não entram no contrato. |
| 🟢 | Filtros compartilháveis | Query persiste em URL e suporta refresh/compartilhamento. |
| 🟠 | Teste dos filtros com dados reais | Falta executar no produto conjunto. |
| 🟠 | Página de imóvel integrada | Galeria, vídeo, status, tipologia, empreendimento/unidade, favorito, CTA e serviços relacionados prontos; falta validar com item real integrado. |
| 🟢 | Serviços relacionados no imóvel | Investimentos, Assessoria Jurídica e Arquitetura aparecem como rotas reais, sem ofertas fictícias. |
| 🟢 | Estilo de vida | Tags reais levam diretamente ao catálogo filtrado. |
| 🟢 | Captura anônima | Nome + WhatsApp obrigatórios; e-mail opcional; nada fictício. |
| 🟢 | Vender/alugar — interface | Estados `idle/busy/success/error`; sucesso só aparece quando a conversão foi aceita. |
| 🟠 | Vender/alugar — fluxo final | Falta instanciar CRM e WhatsApp oficial no produto conjunto. |
| 🟠 | Retenção de comprador | Exit-intent, modal acessível, captura e evento prontos; falta pipeline integrado. |
| 🟢 | Adapter Frente04 | Conversão pública → `LeadConversionEvent`, sem envio automático de mensagem. |
| 🟢 | Bloqueio sem contato | Sem contato válido o adapter falha explicitamente e impede continuação externa. |
| 🟢 | Pipeline CRM → WhatsApp | CRM precisa concluir antes do redirecionamento. |
| 🟢 | Continuação para WhatsApp | `wa.me` contextual preparado sem telefone fictício; telefone exige formato internacional válido. |
| 🟢 | Adapter Frente01 | Reutiliza sessão/perfil reais da Frente01 e consome `user.id` como identidade para dados persistentes. |
| 🟢 | Compatibilidade com Auth real da Frente01 | `useAuth`, `ClientRoute`, `InternalRoute`, usuário e perfil conferidos contra o contrato atual. Backend dedicado da Hárpia está ativo. |
| 🟠 | Login/cadastro integrado | Auth/backend existem; falta montar a F2 no `AppRouter` e executar login/cadastro no produto conjunto. |
| 🟢 | Bridge de favoritos | Cliente real + item real + `PublicFavoritesStorePort`, sem `localStorage`. |
| 🟢 | Adapter Supabase de favoritos | `createSupabaseFavoritesStore` implementado sobre o schema oficial `client_favorites`; typecheck isolado sem erros. |
| 🟢 | Banco de favoritos — estrutura/segurança | Tabela real existente no Supabase com PK cliente+item, FKs para cliente e catálogo, RLS habilitado; Security Advisor com 0 lints; `anon` e `authenticated` sem identidade enxergam 0 linhas. |
| 🟠 | Favoritos ponta a ponta | Falta regenerar `database.types.ts` central, ligar o client oficial, usar conta real e validar salvar/remover/persistir. |
| 🟢 | Estados de favoritos | Carregamento, falha, retry e atualização sem promise rejeitada solta estão tratados na camada F2. |
| 🟢 | Área do cliente — interface | Perfil, favoritos, serviços, interesses e histórico têm dados/loading/erro/empty state. |
| 🟢 | Retry da área do cliente | Falha em favoritos/interesses/histórico expõe tentativa de recarga real. |
| 🟢 | Porta de interesses/histórico | `useClientAreaData` aceita qualquer fonte real por `clientId` sem acoplar a tela ao CRM. |
| 🟠 | Área do cliente com dados persistidos reais | Auth e favoritos já têm backend real; ainda falta montagem `/conta`, client tipado, conta real e fonte de interesses/histórico. |
| 🟢 | Zero mocks permanentes | Ausência de dados gera estado vazio/erro real. |
| 🟢 | Loading/erro/vazio | Cobertura explícita nas principais jornadas. |
| 🟠 | Responsividade | Código responsivo pronto; falta teste visual real desktop/mobile. |
| 🟠 | Montagem no bootstrap global | `AppRouter` da Frente01 ainda precisa trocar `PublicPlaceholder` pelo shell F2 e `ClientAccountShell` básico por `Front02ClientAccountShell` dentro do `ClientRoute`. |
| 🔴 | Build integrado e E2E | NÃO VERIFICADO até merge e execução no Node `>=24 <25` exigido pelo projeto. |
| 🔴 | Teste visual real | NÃO VERIFICADO sem execução no produto integrado. |

## Avanço liberado pela Frente01 nesta rodada

A Frente01 removeu dois bloqueios grandes:

1. o Supabase dedicado da Hárpia já existe e está ativo;
2. `client_favorites` já existe de forma integrada a `user_profiles` e `catalog_items`.

A Frente02 aproveitou isso para:

- inspecionar o schema real em vez de criar banco paralelo;
- remover uma tentativa de schema concorrente da própria branch;
- criar `createSupabaseFavoritesStore` compatível com o schema oficial;
- criar `Front02ClientAccountShell` para `/conta` protegido pela Frente01;
- criar `matchesFront02PublicRoute` para simplificar o `AppRouter`;
- validar RLS/constraints/advisors do banco real;
- gerar os tipos atuais do Supabase e detectar que o `database.types.ts` versionado pela Frente01 precisa ser atualizado.

## Dependências formais restantes

### Frente01 / integrador

Resolvido/confirmado:

- backend Supabase dedicado ativo;
- Auth/RLS do núcleo aplicados;
- schema `client_favorites` real aplicado;
- contrato público Auth compatível.

Ainda pendente:

- regenerar `src/core/supabase/database.types.ts` usando o schema atual;
- montar `Front02IntegrationShell` nas rotas reconhecidas por `matchesFront02PublicRoute`;
- montar `Front02ClientAccountShell` em `/conta` dentro do `ClientRoute`;
- ligar `createSupabaseFavoritesStore` ao client oficial;
- executar cadastro/login/logout/sessão/favoritos com conta real.

### Frente03 / integrador

- instanciar `createFront03PublicCatalogReader` sobre o `PublicCatalogService` real;
- validar catálogo, tipologia, filtros e detalhes com dados publicados reais.

### Frente04 / integrador

- instanciar `createFront04ConversionHandler` sobre o CRM real;
- fornecer, quando disponível, fonte real de interesses/histórico vinculada ao cliente.

### Integração final

- obter telefone oficial em formato internacional e configurar `createWhatsAppContinuation`;
- executar build/typecheck no Node correto;
- testar rotas, auth, catálogo, favoritos, CRM, WhatsApp e responsividade.

## Validações executadas nesta rodada

- schema real de `client_favorites` inspecionado;
- RLS confirmado ativo;
- FKs `client_id → user_profiles` e `item_id → catalog_items` confirmadas;
- PK `(client_id,item_id)` confirmada;
- Security Advisor: 0 lints;
- Performance Advisor: somente índices ainda não usados, esperado em banco novo;
- leitura como `anon`: 0 linhas;
- leitura como `authenticated` sem identidade: 0 linhas;
- typecheck isolado do adapter de favoritos e matcher de rotas: sem erros;
- nenhum usuário/imóvel fictício criado para testes.

## Próximo passo da Frente02

No recorte da Frente01, o próximo avanço depende agora de **montagem no AppRouter + atualização dos tipos centrais + conta real**. A partir daí a Frente02 volta imediatamente para QA real de `/`, `/conta`, Auth e favoritos. Em paralelo permanecem as integrações com Frente03 e Frente04.
