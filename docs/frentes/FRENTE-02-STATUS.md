# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: AGUARDANDO DADOS/PUBLICAÇÃO/QA EXECUTÁVEL — CÓDIGO FUNCIONAL F02 SINCRONIZADO NA FRENTE01

## Legenda

- 🟢 CONCLUÍDO: implementado e confirmado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: depende de dado real, configuração operacional, publicação ou validação executável.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada.

## Estado integrado atual

A Frente01 incorporou o código funcional atual da Frente02, inclusive o último hardening de confirmação visual pós-lead. O blob de `src/features/public-site/Front02IntegrationShell.tsx` é o mesmo nas duas branches (`703700c468b93766be1a0736dc8296d92f66714c`).

Portanto, **não há delta funcional F02 → F01 pendente neste momento**. As diferenças restantes entre branches são de histórico/documentação.

A Frente01 também já contém o código funcional atual da Frente03 necessário à experiência pública.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e integrada. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura. |
| 🟢 | Busca rápida | Finalidade, cidade, localização e estilo de vida. |
| 🟢 | Cidade → localização | Opções reais agrupadas por cidade e autocorreção de opções obsoletas. |
| 🟢 | Filtros URL | Sanitização, valores inválidos, faixa invertida e limites tratados. |
| 🟢 | Catálogo público | F3 funcional integrado; unidade órfã, preço público, lookup, mídia e integridade alinhados. |
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
| 🟢 | Conversão F2 → F4 | Nome + WhatsApp obrigatórios; contrato compatível. |
| 🟢 | Identidade do lead | Frontend remove identidade; backend deriva `clientId` do JWT de cliente ativo. |
| 🟢 | RPC privilegiada | `admin_ingest_public_lead` é `SECURITY DEFINER`; EXECUTE limitado a `postgres` e `service_role`. |
| 🟢 | `public-lead-ingest` | Edge Function ativa v3 com hardening de identidade. |
| 🟢 | `client-area-data` | Edge Function ativa v2 com JWT obrigatório e filtro pelo usuário autenticado. |
| 🟢 | CRM → WhatsApp | CRM executa primeiro; falha externa não reverte lead aceito. |
| 🟢 | Confirmação sem WhatsApp | Integrada também na F1; lead aceito gera confirmação visual quando não há continuação externa. |
| 🟢 | WhatsApp inválido | Não derruba o site nem impede lead. |
| 🟢 | Rota malformada | Error Boundary evita tela branca. |
| 🟢 | Runtime catálogo | Supabase real + produtor F3 funcional atual. |
| 🟢 | Zero mocks permanentes | Nenhum dado fictício foi criado para pintar QA de verde. |
| 🟠 | WhatsApp final | `organization_settings.phone` continua sem número operacional; F5 mantém WhatsApp real para fase final. |
| 🟠 | Catálogo real para QA | Backend consultado continua sem item publicado operacional. |
| 🟠 | Conta/favoritos E2E | Backend consultado continua sem perfil/favorito operacional. |
| 🟠 | CRM/histórico E2E | Backend consultado continua sem lead/histórico operacional. |
| 🟠 | Publicação visual | `gh-pages` observada ainda é a landing HTML antiga e não representa o React integrado atual. |
| 🟠 | Responsividade visual | CSS existe; aplicação integrada ainda precisa ser validada em navegador. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO. Projeto exige Node `>=24 <25`; ambiente desta sessão tem Node 22 e não possui checkout local. |
| 🔴 | E2E/browser real | NÃO VERIFICADO. |

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

## Estado operacional observado no Supabase

Consulta mais recente:

- perfis: 0;
- itens de catálogo: 0;
- itens publicados: 0;
- favoritos: 0;
- leads: 0;
- histórico CRM: 0;
- telefone da organização: `null`.

## Pendências externas reais

### Frente01 / integrador

1. publicar/servir a aplicação React integrada atual; a `gh-pages` existente ainda representa a landing estática antiga;
2. ligar `organization_settings.phone` ao `whatsappPhone` da F2 quando houver número oficial;
3. executar build/typecheck no Node suportado.

### Dados reais / operação

- telefone oficial para WhatsApp;
- conta de cliente para QA;
- item real publicado;
- atendimento/conversão real.

## Próximo passo da Frente02

Não existe implementação funcional própria pendente conhecida neste momento. Assim que houver publicação da aplicação atual e dados operacionais mínimos, executar: navegação pública → login/cadastro → favorito → lead → área do cliente → WhatsApp → QA visual desktop/mobile → E2E.
