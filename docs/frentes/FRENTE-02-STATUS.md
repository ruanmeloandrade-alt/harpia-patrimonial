# Frente02 — Semáforo de execução

Data-base: 16/09/2026
Branch: `frente-02`
Estado executivo: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE NA FRENTE01; QA ESTÁTICO ATIVO / BUILD E E2E PENDENTES

## Legenda

- 🟢 CONCLUÍDO: implementado e confirmado no recorte descrito.
- 🟠 PARCIAL / INTEGRAÇÃO: implementação/composição existe, mas falta sync, dado real, correção compartilhada ou validação executável.
- 🔴 NÃO CONCLUÍDO: validação obrigatória ainda não executada.

## Estado integrado atual

A Frente01 já incorporou a base funcional da Frente02 ao produto conjunto:

- `AppRouter` encaminha as rotas públicas para `IntegratedPublicExperience`;
- `IntegratedPublicExperience` monta `Front02IntegrationShell`;
- `PlatformRuntime` fornece `PublicCatalogService` da Frente03;
- favoritos usam store Supabase central da Frente01;
- conversões públicas usam a Edge Function `public-lead-ingest`;
- interesses/histórico usam a Edge Function autenticada `client-area-data`;
- `/conta` encaminha para `/cliente`;
- Auth vem exclusivamente da Frente01.

A retomada desta rodada confirmou que F01, F03 e F04 continuam avançando. Isso liberou a Frente02 para continuar QA estático e hardening próprio sem esperar a conclusão total das outras frentes.

## Escopo e andamento

| Status | Item | Estado atual |
|---|---|---|
| 🟢 | Home pública | Implementada e já montada no roteador integrado. |
| 🟢 | Páginas institucionais | Sobre, Investimentos, Leilões, Jurídico e Arquitetura montadas. |
| 🟢 | Navegação pública | Rotas estáticas e `/imoveis/:slug` montadas pela Frente01. |
| 🟢 | Busca rápida na home | Implementada com filtros reais do catálogo. |
| 🟢 | Catálogo/filtros — F2 | Contrato F3 e adapter F2 conectados ao `PublicCatalogService`. |
| 🟠 | Catálogo público — último sync F3 | A F3 atual já filtra unidade órfã cujo empreendimento não está publicado e busca código sem diferenciar maiúsculas/minúsculas. A cópia integrada observada na F1 ainda está anterior; precisa sincronização F3→F1. |
| 🟢 | Filtros compartilháveis/sanitizados | URL, refresh e rejeição de NaN, negativos e lançamento inválido implementados. |
| 🟢 | Tipologia e empreendimento/unidade | Adapter usa `typology` e resolve pai real. |
| 🟢 | Detalhe do imóvel | Galeria, vídeo, status, características, serviços, CTA e favorito implementados. |
| 🟢 | Estilo de vida | Usa classificações reais do catálogo. |
| 🟢 | Vender/alugar — interface | Formulário e estados reais; sucesso somente quando `emitConversion` confirma aceitação. |
| 🟢 | Retenção de comprador | Exit-intent + captura implementados. |
| 🟢 | Auth F1 → F2 | Sessão/perfil central conectados. |
| 🟢 | Isolamento cliente/interno | `Front02IntegrationShell` agora só habilita `clientId` persistente para conta `client` ativa. Commit `14918a0ac99e953d470f16c40630a34e35513ea1`. |
| 🟢 | Favoritos — estrutura de banco | `client_favorites` existe com PK, FKs, RLS e policies de dono. |
| 🟢 | Favoritos — integração estrutural | `PlatformRuntime` fornece store Supabase real à Frente02. |
| 🟢 | Favoritos — resolução resiliente | Recarregamento resolve primeiro pelo `item_id` estável e usa `item_slug` apenas como fallback, evitando perda visual após mudança de código. Commit `39f2cd8be0152eaae1e1d840a48b37ad78de9614`. |
| 🟢 | Favoritos — troca de sessão | Leituras/mutações obsoletas não podem mais sobrescrever a conta nova. Commit `a231a10e95d4502033832cac4621771d8dc6b220`. |
| 🟢 | Área do cliente — backend | `client-area-data` está publicada, exige JWT e está ligada à F2. |
| 🟢 | Área do cliente — interface | Perfil, favoritos, interesses, histórico, serviços, loading/erro/retry implementados. |
| 🟢 | Área do cliente — troca de sessão | Resposta assíncrona antiga é ignorada após mudança de cliente/source. Commit `6f232a41b41bc48fa833faab39d531587a5dcb27`. |
| 🟢 | Conversão pública — backend | `public-lead-ingest` está publicada e ligada ao shell integrado. |
| 🟢 | Pipeline CRM → WhatsApp | Continua somente após sucesso da captura; navegação usa mesma aba e não depende de popup. |
| 🟢 | Acessibilidade/metadata/404 | Implementados na experiência pública. |
| 🟢 | Zero mocks permanentes | Backend permanece vazio quando não há dados reais. |
| 🟠 | Hardening nome + WhatsApp | Corrigido na F2 no commit `5f8f1f3984619b930750bcf301a1d0e30da0a9cd`; falta sync na cópia integrada da F1. |
| 🟠 | Rota de imóvel com encoding inválido | QA identificou risco de `decodeURIComponent` lançar exceção para URL malformada. Correção F2 ainda pendente por exigir edição coordenada do arquivo grande já integrado. |
| 🟠 | Tipos Supabase centrais | `database.types.ts` observado na F1 ainda não contém estruturas recentes embora o client seja `createClient<Database>`. Precisa regeneração antes do typecheck integrado. |
| 🟠 | Idempotência de favoritos central | Store F1 usa `upsert`; policies RLS verificadas não incluem UPDATE. Preferência registrada: `insert` + tratar `23505`, sem abrir UPDATE desnecessário. |
| 🟠 | Integridade `clientId` do lead | Backend público não deve confiar em `metadata.clientId` do caller; deve derivar identidade server-side de JWT válido quando presente. |
| 🟠 | Catálogo real para QA | Runtime conectado, porém banco observado possui 0 itens e 0 publicados. Não criar dados fictícios. |
| 🟠 | Conta/favoritos E2E | Banco observado possui 0 perfis e 0 favoritos; falta conta real para validar sessão/persistência. |
| 🟠 | WhatsApp final | `organization_settings.phone` observado como nulo; F2 não injeta número fictício. |
| 🟠 | CRM com atendimento real | Backend existe, mas não há lead real para validar jornada completa. |
| 🟠 | Responsividade visual | CSS responsivo existe; ainda sem QA em navegador real integrado. |
| 🔴 | Typecheck/build integrado | NÃO VERIFICADO no ambiente exigido (`Node >=24 <25`). |
| 🔴 | E2E/browser real | NÃO VERIFICADO. |

## QA de backend executado pela Frente02

- projeto Supabase Hárpia confirmado;
- RLS de `client_favorites` confirmado ativo;
- PK `(client_id,item_id)` e FKs para `user_profiles`/`catalog_items` confirmadas;
- policies observadas: SELECT own, INSERT own/cliente ativo/item publicado, DELETE own;
- leitura como `anon`: 0 linhas;
- leitura como role `authenticated` sem identidade: 0 linhas;
- `admin_ingest_public_lead` exige `service_role` e não é executável diretamente pelo browser;
- `public-lead-ingest` usa credencial server-side e retorna `automaticMessageSent:false`;
- `client-area-data` valida JWT + conta de cliente ativa;
- estado real observado: 0 perfis, 0 itens de catálogo, 0 publicados, 0 favoritos, telefone oficial nulo, CRM revisão 0;
- nenhum usuário, imóvel, lead ou favorito fictício foi criado para “passar teste”.

## Pendências compartilhadas prioritárias

### Frente01 / integração

1. sincronizar o hardening `PublicExperience.tsx` do commit F2 `5f8f1f3984619b930750bcf301a1d0e30da0a9cd`;
2. sincronizar os hardenings F2 desta retomada (`39f2cd8`, `a231a10`, `6f232a4`, `14918a0`);
3. regenerar `src/core/supabase/database.types.ts` a partir do schema atual;
4. alinhar idempotência do favorites store ao RLS;
5. endurecer `public-lead-ingest` para não confiar em `metadata.clientId` enviado pelo caller;
6. executar typecheck/build no ambiente correto.

### Frente03 / integração

1. sincronizar a versão atual do `PublicCatalogService`, especialmente a exclusão de unidades sem empreendimento publicado;
2. sincronizar busca de código case-insensitive;
3. depois validar com item real publicado quando houver dado operacional.

### Dados reais / operação

- configurar telefone oficial da organização para habilitar continuação WhatsApp;
- ter pelo menos uma conta de cliente real para QA Auth/área/favoritos;
- ter item publicado real para QA catálogo/detalhe/favorito;
- ter atendimento real para QA histórico/interesses.

## Próximo passo da Frente02

Continuar pente-fino estático nos módulos próprios e corrigir bugs independentes sem aguardar outras frentes. Quando os syncs compartilhados entrarem, retomar imediatamente QA integrado com dados reais disponíveis. Itens de build, browser e E2E permanecem `NÃO VERIFICADO` até execução real.
