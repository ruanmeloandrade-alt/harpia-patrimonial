# Frente02 — Semáforo de execução

Data-base: 17/09/2026
Branch: `frente-02`
Estado executivo: AGUARDANDO PUBLICAÇÃO CORRETA/DADOS/QA VISUAL — QA LÓGICO/BACKEND EXECUTADO E CÓDIGO FUNCIONAL F02 SINCRONIZADO NA FRENTE01

## Legenda

- 🟢 CONCLUÍDO: implementado e confirmado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: depende de dado real, configuração operacional ou validação executável.
- 🔴 NÃO CONCLUÍDO / BLOQUEIO: requisito obrigatório não validado ou estado publicado incompatível com a entrega.

## Estado integrado atual

A Frente01 incorporou o código funcional atual da Frente02, inclusive o último hardening de confirmação visual pós-lead. O blob de `src/features/public-site/Front02IntegrationShell.tsx` é o mesmo nas duas branches (`703700c468b93766be1a0736dc8296d92f66714c`).

Portanto, **não há delta funcional F02 → F01 pendente neste momento**. As diferenças restantes entre branches são de histórico/documentação.

A Frente01 também já contém o código funcional atual da Frente03 necessário à experiência pública.

## Verificação retomada em 17/09/2026

- branch F02 observada em `be0e2615d538079a00e08f501e6328b4adb7959c` antes desta atualização documental;
- branch F01 observada em `d0b137241621d064fb5b80389a3cf3f73b7d7d21`;
- `Front02IntegrationShell.tsx` confirmado novamente com o mesmo blob nas duas branches;
- projeto Supabase `Harpia Patrimonial` está `ACTIVE_HEALTHY`;
- estado operacional continua vazio: `auth.users=0`, `user_profiles=0`, `catalog_items=0`, publicados `0`, favoritos `0`, outbox `0` e telefone da organização `null`;
- `public-lead-ingest` continua ACTIVE v3;
- `client-area-data` continua ACTIVE v2;
- Supabase Security Advisor continua com `0` lints;
- a branch `gh-pages` continua em `5102c78ca11a2486b8e193f2fdbd8580e054b20f` e serve uma landing HTML antiga com imóveis, bairros e valores fictícios;
- o React atual da F02 não usa esses imóveis fictícios: usa catálogo real/empty state (`emptyPublicCatalogReader`) e declara explicitamente ausência de ofertas fictícias.

Conclusão: o principal bloqueio visível da Frente02 não é implementação própria. É **publicação incorreta**: o destino publicado ainda expõe uma landing antiga com mocks, enquanto o React integrado atual permanece sem QA visual/E2E publicado.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e integrada. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura. |
| 🟢 | Busca rápida | Finalidade, cidade, localização e estilo de vida. |
| 🟢 | Cidade → localização | Opções reais agrupadas por cidade e autocorreção de opções obsoletas. |
| 🟢 | Filtros URL | Sanitização, valores inválidos, faixa invertida e limites tratados; QA lógico executado. |
| 🟢 | Catálogo público | F3 funcional integrado; unidade órfã, preço público, lookup, mídia e integridade alinhados; adapter exercitado em QA descartável. |
| 🟢 | Detalhe do imóvel | Galeria, vídeo, características, empreendimento/unidade, serviços, CTA e favorito. |
| 🟢 | Vender/alugar | Só mostra sucesso após conversão aceita. |
| 🟢 | Retenção | Exit-intent e captura implementados. |
| 🟢 | Auth F1 → F2 | Sessão/perfil central consumidos sem auth paralelo. |
| 🟢 | Isolamento cliente/interno | Dados pessoais só carregam para cliente ativo. |
| 🟢 | Favoritos — schema | PK `(client_id,item_id)`, FKs usuário/item e RLS ativos. |
| 🟢 | Favoritos — policies | SELECT/DELETE apenas do próprio `auth.uid()`; INSERT exige cliente ativo e item publicado. |
| 🟢 | Favoritos — idempotência | Store F1 usa `insert`; conflito `23505` é tratado sem UPDATE. |
| 🟢 | Favoritos — segurança | Security Advisor Supabase: 0 lints. |
| 🟢 | Favoritos — UX/concorrência | ID estável, fallback slug, proteção entre sessões, clique duplo, reload obsoleto e erro visível tratados. |
| 🟢 | Área do cliente | Perfil, favoritos, interesses, histórico, loading, erro, retry e isolamento entre contas/fontes. |
| 🟢 | Conversão F2 → F4 | Nome + WhatsApp obrigatórios; contrato compatível; pipeline exercitado em QA. |
| 🟢 | Identidade do lead | Frontend remove identidade; backend deriva `clientId` do JWT de cliente ativo. |
| 🟢 | RPC privilegiada | `admin_ingest_public_lead` é `SECURITY DEFINER`; EXECUTE limitado a `postgres` e `service_role`; teste transacional descartável documentado em 16/09 passou. |
| 🟢 | `public-lead-ingest` | Edge Function ativa v3 com hardening de identidade. |
| 🟢 | `client-area-data` | Edge Function ativa v2 com JWT obrigatório e filtro pelo usuário autenticado. |
| 🟢 | CRM → WhatsApp | CRM executa primeiro; falha externa não reverte lead aceito; ordem exercitada em QA. |
| 🟢 | Confirmação sem WhatsApp | Integrada também na F1; lead aceito gera confirmação visual quando não há continuação externa. |
| 🟢 | WhatsApp inválido | Não derruba o site nem impede lead; normalização/rejeição exercitadas em QA. |
| 🟢 | Rota malformada | Error Boundary evita tela branca. |
| 🟢 | Runtime catálogo | Supabase real + produtor F3 funcional atual. |
| 🟢 | Zero mocks no React atual | Código F02 usa catálogo real/empty state e não contém o inventário fictício observado na publicação antiga. |
| 🟠 | WhatsApp final | `organization_settings.phone` continua sem número operacional; F5 mantém WhatsApp real para fase final. |
| 🟠 | Catálogo real para QA | Backend consultado continua sem item publicado operacional. |
| 🟠 | Conta/favoritos E2E | Backend consultado continua sem perfil/favorito operacional. |
| 🟠 | CRM/histórico E2E | CRM integrado está vazio; não há atendimento operacional persistente para E2E. |
| 🔴 | Publicação visual | `gh-pages` continua servindo landing HTML antiga com imóveis/valores fictícios e não representa o React integrado atual. Não aceitar como entrega/QA da F02. |
| 🟠 | Responsividade visual | CSS existe; aplicação React integrada ainda precisa ser validada em navegador. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO. Projeto exige Node `>=24 <25`; checkout executável integral não está disponível nesta sessão. |
| 🔴 | E2E/browser real | NÃO VERIFICADO. |

## QA executável documentado em 16/09/2026

Documento detalhado: `docs/frentes/FRENTE-02-QA-EXECUTAVEL.md`.

- 25 asserções passaram sobre filtros, catálogo público, unidade órfã, empreendimento/unidade, pipeline CRM → WhatsApp, sanitização de identidade e contato obrigatório.
- RPC `admin_ingest_public_lead` foi exercitada em subtransação descartável: lead, revisão CRM e `lead.created` foram confirmados e depois revertidos integralmente.
- Pós-rollback confirmado: CRM revision `0`, leads `0` e nenhum evento de QA persistente no outbox.
- `anon` e `authenticated` sem `EXECUTE` na RPC privilegiada; `service_role` com `EXECUTE`.
- Supabase Security Advisor: 0 lints.

## QA de segurança confirmado

### `client_favorites`

- RLS habilitado;
- SELECT/DELETE por `client_id = auth.uid()`;
- INSERT exige usuário dono, perfil `client` ativo e imóvel publicado;
- FK `client_id → user_profiles(id)`;
- FK `item_id → catalog_items(id)`;
- PK `(client_id,item_id)`;
- Security Advisor: 0 lints.

### Lead público / Área do Cliente

- `public-lead-ingest` sanitiza metadata do caller;
- identidade é derivada pelo JWT quando existe sessão válida;
- somente cliente ativo recebe vínculo `clientId` server-side;
- RPC privilegiada não é executável por `anon`/`authenticated`;
- `client-area-data` exige JWT e filtra histórico/interesses pelos leads do usuário autenticado.

## Estado operacional observado no Supabase em 17/09/2026

- usuários Auth: 0;
- perfis: 0;
- itens de catálogo: 0;
- itens publicados: 0;
- favoritos: 0;
- CRM: revision 0, leads 0, histórico 0;
- outbox: 0;
- telefone da organização: `null`.

Observação: leads e histórico do CRM são persistidos dentro de `platform_module_state.state` no módulo `crm`, não em tabelas `public.leads`/`public.crm_history` separadas.

## Pendências externas reais

### Frente01 / integrador

1. **substituir a publicação antiga** e servir a aplicação React integrada atual; a `gh-pages` existente contém dados fictícios e não pode ser considerada a entrega;
2. ligar `organization_settings.phone` ao `whatsappPhone` da F2 quando houver número oficial;
3. executar build/typecheck no Node suportado.

### Dados reais / operação

- telefone oficial para WhatsApp;
- conta de cliente para QA;
- item real publicado;
- atendimento/conversão real.

## Próximo passo da Frente02

Não existe implementação funcional própria pendente conhecida neste momento. A F02 deve permanecer sem inventar dados ou invadir ownership da F01/F03/F04. Assim que a aplicação React integrada for publicada e houver dados operacionais mínimos, executar: navegação pública → login/cadastro → favorito → lead → área do cliente → WhatsApp → QA visual desktop/mobile → E2E.
