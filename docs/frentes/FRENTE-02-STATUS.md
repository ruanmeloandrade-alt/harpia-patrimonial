# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: EM ANDAMENTO — BASE F02 INTEGRADA NA FRENTE01; QA DE INTEGRAÇÃO ATIVO; DADOS REAIS, BUILD E BROWSER/E2E PENDENTES

## Legenda

- 🟢 CONCLUÍDO: implementado e confirmado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: falta dado real, configuração operacional, sync pontual ou validação executável.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada.

## Mudança importante desta rodada

A Frente01 avançou e incorporou o head funcional anterior da Frente02. A comparação atual mostra apenas **1 arquivo funcional novo da F02** pendente de sync:

- `src/features/public-site/Front02IntegrationShell.tsx` — confirmação visual após atendimento aceito quando não houver continuação WhatsApp.

Commit F02: `9d55666aeae2b1210325b8dcc8b1277a8690532`.

Também foram removidos bloqueios antigos:

- `SupabaseFavoritesStore.add()` agora usa `insert` e ignora somente `23505`, sem depender de UPDATE no RLS;
- `public-lead-ingest` remove identidade fornecida pelo caller e deriva `clientId` server-side a partir do JWT de cliente ativo;
- `client-area-data` exige JWT e entrega apenas dados vinculados ao usuário autenticado;
- F1 já contém o código funcional atual da F3; os deltas restantes F3 → F1 observados são somente documentação/handoff.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e integrada estruturalmente. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura. |
| 🟢 | Busca rápida | Finalidade, cidade, localização e estilo de vida. |
| 🟢 | Cidade → localização | Opções reais agrupadas por cidade, com fallback compatível. |
| 🟢 | Filtros URL | Sanitização, faixa invertida, valores inválidos e campos excessivos tratados. |
| 🟢 | Catálogo público | F3 atual integrado funcionalmente na F1; unidade órfã, preço público, lookup e integridade alinhados. |
| 🟢 | Detalhe do imóvel | Galeria, vídeo, características, empreendimento/unidade, serviços, CTA e favorito. |
| 🟢 | Vender/alugar | Só mostra sucesso após conversão aceita. |
| 🟢 | Retenção | Exit-intent e captura implementados. |
| 🟢 | Auth F1 → F2 | Sessão/perfil central consumidos sem auth paralelo. |
| 🟢 | Isolamento cliente/interno | Dados pessoais só carregam para cliente ativo. |
| 🟢 | Favoritos — schema | PK `(client_id,item_id)`, FKs usuário/item e RLS ativos. |
| 🟢 | Favoritos — policies | SELECT/DELETE apenas do próprio `auth.uid()`; INSERT exige cliente ativo e item publicado. |
| 🟢 | Favoritos — idempotência | Store F1 usa `insert`; conflito de PK `23505` é tratado sem UPDATE. |
| 🟢 | Favoritos — segurança | Security Advisor do Supabase retornou 0 lints. |
| 🟢 | Favoritos — UX/concorrência | ID estável, fallback slug, proteção entre sessões, clique duplo e reload obsoleto tratados. |
| 🟢 | Área do cliente | Perfil, favoritos, interesses, histórico, loading, erro, retry e isolamento entre contas/fontes. |
| 🟢 | Conversão F2 → F4 | Nome + WhatsApp obrigatórios; contrato continua compatível. |
| 🟢 | Identidade do lead | Frontend remove identidade do metadata; Edge Function publicada deriva `clientId` pelo JWT de cliente ativo. |
| 🟢 | RPC privilegiada | `admin_ingest_public_lead` é `SECURITY DEFINER`, mas EXECUTE está limitado a `postgres` e `service_role`. |
| 🟢 | `public-lead-ingest` publicado | Edge Function ativa v3, pública para captação anônima e com hardening de identidade. |
| 🟢 | `client-area-data` publicado | Edge Function ativa v2 com JWT obrigatório. |
| 🟢 | CRM → WhatsApp | CRM sempre executa antes da continuação; falha externa não reverte lead aceito. |
| 🟢 | Confirmação sem WhatsApp | Implementada na F2 no commit `9d55666`; falta apenas sync pontual para F1. |
| 🟢 | WhatsApp inválido | Não derruba o site nem impede lead. |
| 🟢 | Rota malformada | Error Boundary evita tela branca. |
| 🟢 | Tipos Supabase | F1 já possui tipos atualizados para catálogo/favoritos. |
| 🟢 | Runtime catálogo | F1 usa runtime Supabase real e contém o código funcional atual da F3. |
| 🟢 | Zero mocks permanentes | Nenhum dado fictício foi criado para pintar QA de verde. |
| 🟠 | Sync pontual F2 → F1 | Falta somente `Front02IntegrationShell.tsx` do commit `9d55666`. |
| 🟠 | WhatsApp final | `organization_settings.phone` continua sem número operacional; F5 mantém WhatsApp real para fase final. |
| 🟠 | Catálogo real para QA | Ainda depende de item publicado operacional. |
| 🟠 | Conta/favoritos E2E | Ainda depende de conta real/teste operacional. |
| 🟠 | CRM/histórico E2E | Ainda depende de atendimento real/teste operacional. |
| 🟠 | Publicação visual | `gh-pages` observado ainda é a página HTML estática antiga e não representa o React integrado atual. |
| 🟠 | Responsividade visual | CSS existe; navegador da aplicação integrada ainda precisa ser validado. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO. Projeto exige Node `>=24 <25`; ambiente desta sessão possui Node 22 e não tem checkout local do repo. |
| 🔴 | E2E/browser real | NÃO VERIFICADO. |

## QA de segurança confirmado nesta rodada

### `client_favorites`

- RLS habilitado;
- policy `SELECT` somente `client_id = auth.uid()`;
- policy `DELETE` somente `client_id = auth.uid()`;
- policy `INSERT` exige `client_id = auth.uid()`, perfil `client` ativo e `catalog_items.status = published`;
- FK `client_id → user_profiles(id)`;
- FK `item_id → catalog_items(id)`;
- PK `(client_id,item_id)`;
- Security Advisor: 0 lints.

### Lead público / Área do Cliente

- `public-lead-ingest` sanitiza metadata recebida;
- identidade autenticada é obtida pelo JWT, nunca pelo `clientId` do body;
- somente cliente ativo recebe `metadata.clientId` server-side;
- RPC privilegiada não é executável por `anon`/`authenticated`;
- `client-area-data` exige JWT e filtra histórico/interesses pelos leads vinculados ao usuário autenticado.

## Pendências externas reais

### Frente01 / integrador

1. sincronizar o único delta novo da F2: `Front02IntegrationShell.tsx` do commit `9d55666`;
2. manter `organization_settings.phone` como fonte do telefone oficial quando a operação preencher o número;
3. publicar/servir a aplicação React integrada, pois a `gh-pages` atual ainda representa a landing estática antiga;
4. executar build/typecheck no Node suportado.

### Dados reais / operação

- telefone oficial para WhatsApp;
- conta de cliente para QA;
- item real publicado;
- atendimento/conversão real.

## Próximo passo da Frente02

Enquanto o sync pontual não entra, continuar somente QA estático da composição integrada. Assim que houver publicação da aplicação atual e dados operacionais mínimos, executar: navegação pública → login/cadastro → favorito → lead → área do cliente → WhatsApp → QA visual desktop/mobile → E2E.
