# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE NA FRENTE01; QA REAL/BUILD E CORREÇÕES DE INTEGRAÇÃO PENDENTES

## Legenda

- 🟢 CONCLUÍDO: implementado e confirmado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: implementação/composição existe, mas falta dado real, correção compartilhada ou validação executável.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada.

## Estado integrado atual

A Frente01 já incorporou o código funcional da Frente02 ao produto conjunto:

- `AppRouter` encaminha as rotas públicas para `IntegratedPublicExperience`;
- `IntegratedPublicExperience` monta `Front02IntegrationShell`;
- `PlatformRuntime` fornece `PublicCatalogService` real da Frente03;
- favoritos usam store Supabase central da Frente01;
- conversões públicas usam a Edge Function `public-lead-ingest`;
- interesses/histórico usam a Edge Function autenticada `client-area-data`;
- `/conta` encaminha para `/cliente`;
- Auth vem exclusivamente da Frente01.

Na comparação mais recente entre `frente-01` e `frente-02`, após a convergência, restou **um único delta funcional da F2**: o hardening de contato em `PublicExperience.tsx`.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e já montada no roteador integrado. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura montadas. |
| 🟢 | Navegação pública | Rotas estáticas e `/imoveis/:slug` montadas pela Frente01. |
| 🟢 | Busca rápida na home | Implementada com filtros reais do catálogo. |
| 🟢 | Catálogo/filtros | Contrato F3 e adapter F2 já estão conectados ao `PublicCatalogService` real no runtime. |
| 🟢 | Filtros compartilháveis/sanitizados | URL, refresh e rejeição de valores inválidos implementados. |
| 🟢 | Tipologia e empreendimento/unidade | Adapter usa `typology` e resolve pai real. |
| 🟢 | Detalhe do imóvel | Galeria, vídeo, status, características, serviços, CTA e favorito implementados. |
| 🟢 | Estilo de vida | Usa classificações reais do catálogo. |
| 🟢 | Vender/alugar — interface | Formulário e estados reais implementados. |
| 🟢 | Retenção de comprador | Exit-intent + captura implementados. |
| 🟢 | Auth F1 → F2 | Sessão/perfil central conectados pelo `IntegratedPublicExperience`. |
| 🟢 | Favoritos — estrutura de banco | `client_favorites` existe com PK, FKs, RLS e policies de dono. |
| 🟢 | Favoritos — integração estrutural | `PlatformRuntime` fornece store Supabase real à Frente02. |
| 🟢 | Conversão pública — backend | `public-lead-ingest` está publicada e ligada ao shell integrado. |
| 🟢 | Área do cliente — backend | `client-area-data` está publicada, exige JWT e está ligada à F2. |
| 🟢 | Área do cliente — interface | Perfil, favoritos, interesses, histórico, serviços, loading/erro/retry implementados. |
| 🟢 | Acessibilidade/metadata/404 | Implementados na experiência pública. |
| 🟢 | Zero mocks permanentes | Backend está vazio em vez de ser preenchido artificialmente. |
| 🟠 | Hardening nome + WhatsApp | Corrigido na F2 no commit `5f8f1f3984619b930750bcf301a1d0e30da0a9cd`; falta a Frente01 sincronizar esse arquivo. |
| 🟠 | Tipos Supabase centrais | O `database.types.ts` observado na Frente01 ainda não contém `catalog_items`, `client_favorites` e estruturas recentes, embora o client seja `createClient<Database>`. Precisa regeneração antes do typecheck integrado. |
| 🟠 | Idempotência de favoritos | Store central usa `upsert`; tabela possui policies RLS de SELECT/INSERT/DELETE, sem UPDATE. Recomenda-se `insert` + tratar `23505`, ou outra solução explícita, sem abrir UPDATE desnecessário. |
| 🟠 | Integridade `clientId` do lead | `public-lead-ingest` aceita `metadata.clientId` do body; `client-area-data` usa esse campo para associar histórico à conta. O backend deve remover qualquer `clientId` enviado pelo caller e derivá-lo server-side de JWT válido quando presente. |
| 🟠 | Catálogo real para QA | Runtime está conectado, porém banco possui 0 itens e 0 publicados. Não criar dados fictícios. |
| 🟠 | Conta/favoritos E2E | Banco possui 0 perfis e 0 favoritos; falta conta real para validar sessão, salvar/remover e persistir. |
| 🟠 | WhatsApp final | `organization_settings.phone` está nulo; F2 não injeta número fictício. |
| 🟠 | CRM com atendimento real | Backend/RPC/Edge Function existem, mas estado CRM permanece inicial e não há lead real para validar jornada completa. |
| 🟠 | Responsividade visual | CSS responsivo existe; ainda sem QA em navegador real integrado. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO no ambiente exigido pelo projeto (`Node >=24 <25`). |
| 🔴 | E2E/browser real | NÃO VERIFICADO. |

## QA de backend executado pela Frente02

- projeto Supabase correto confirmado: Hárpia Patrimonial;
- RLS de `client_favorites` confirmado ativo;
- PK `(client_id,item_id)` e FKs para `user_profiles`/`catalog_items` confirmadas;
- policies existentes: SELECT own, INSERT own/cliente ativo/item publicado, DELETE own;
- Security Advisor retornou 0 lints na inspeção executada;
- leitura como `anon`: 0 linhas;
- leitura como role `authenticated` sem identidade: 0 linhas;
- `admin_ingest_public_lead` exige `service_role` e não é executável diretamente pelo browser;
- Edge Function `public-lead-ingest` usa credencial server-side e retorna `automaticMessageSent:false`;
- Edge Function `client-area-data` valida JWT + conta de cliente ativa;
- estado real observado: 0 perfis, 0 itens de catálogo, 0 publicados, 0 favoritos, telefone oficial nulo, CRM revisão 0;
- nenhum usuário, imóvel, lead ou favorito fictício foi criado para “passar teste”.

## Pendências compartilhadas prioritárias

### Frente01 / integração

1. sincronizar `PublicExperience.tsx` do commit F2 `5f8f1f3984619b930750bcf301a1d0e30da0a9cd`;
2. regenerar `src/core/supabase/database.types.ts` a partir do schema atual;
3. corrigir idempotência do store de favoritos (`upsert` versus ausência de UPDATE policy);
4. endurecer `public-lead-ingest`: não confiar em `metadata.clientId` enviado pelo caller; derivar identidade server-side quando houver JWT;
5. após esses ajustes, executar typecheck/build no ambiente correto.

### Dados reais / operação

- cadastrar/configurar telefone oficial da organização para habilitar continuação WhatsApp;
- ter pelo menos uma conta de cliente real para QA de Auth/área/favoritos;
- ter item publicado real para QA de catálogo/detalhe/favorito;
- ter atendimento real para QA de histórico/interesses.

## Próximo passo da Frente02

Continuar QA estático do produto integrado e corrigir somente bugs pertencentes à F2. Assim que a Frente01 sincronizar o delta funcional e corrigir os pontos centrais acima, executar QA integrado com dados reais disponíveis e promover os itens somente quando efetivamente testados.
