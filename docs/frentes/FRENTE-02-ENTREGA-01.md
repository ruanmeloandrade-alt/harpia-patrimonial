# Frente02 — Primeira entrega

Data-base: 16/09/2026
Branch: `frente-02`
Objetivo: deixar a experiência pública e a área do cliente prontas para a primeira entrega integrada, sem declarar como validado o que ainda depende de sync, dados reais ou execução em navegador.

## Semáforo executivo

### 🟢 Pronto na Frente02

- home pública e páginas institucionais;
- busca rápida de imóveis com finalidade, cidade, localização e estilo de vida;
- localização da busca da home filtrada pela cidade selecionada;
- filtros sanitizados e compartilháveis por URL;
- faixa de preço coerente com unidades publicadas quando um empreendimento possui unidades;
- catálogo público protegido contra unidade órfã sem empreendimento publicado;
- detalhe do imóvel com galeria, vídeo, dados, empreendimento/unidade, serviços relacionados, CTA e favorito;
- captura de proprietário para venda/locação com sucesso somente após conversão aceita;
- retenção de comprador;
- Auth consumido exclusivamente da Frente01;
- isolamento de dados pessoais somente para conta cliente ativa;
- favoritos por ID estável, fallback por slug, proteção de troca de sessão e serialização contra clique duplo;
- área do cliente com perfil, favoritos, interesses, histórico, loading, erro e retry;
- proteção contra respostas assíncronas obsoletas ao trocar de conta;
- adapter F2→F4 compatível com o contrato atual, exigindo nome + WhatsApp;
- metadata pública sanitizada para não enviar identidade confiável pelo body;
- pipeline CRM antes de WhatsApp;
- WhatsApp mal configurado não derruba o site nem impede criação do lead;
- Error Boundary público para impedir tela branca em URL malformada;
- metadata de página, 404 e navegação mobile;
- nenhum mock permanente ou dado fictício criado para “passar teste”.

## 🟠 Sync/integração que precisa entrar na Frente01

A branch integrada da Frente01 ainda precisa receber os hardenings recentes da Frente02. Os principais arquivos com delta funcional são:

- `src/features/public-site/PublicExperience.tsx`;
- `src/features/public-site/usePublicFavoritesBridge.ts`;
- `src/features/client-area/useClientAreaData.ts`;
- `src/features/public-site/Front02IntegrationShell.tsx`;
- `src/features/public-site/catalogQuery.ts`;
- `src/features/public-catalog/front03Adapter.ts`;
- `src/features/public-catalog/contracts.ts`;
- `src/features/public-site/HomeCatalogSearch.tsx`;
- `src/features/public-site/front04ConversionAdapter.ts`;
- `src/features/public-site/PublicExperienceBoundary.tsx`;
- `src/features/public-site/public-experience.css`.

## 🟢 Dependências que já deixaram de bloquear

- Supabase dedicado Hárpia ativo;
- Auth/session/RLS do núcleo disponíveis;
- `database.types.ts` da Frente01 regenerado com `catalog_items` e `client_favorites`;
- `PlatformRuntime` usa `SupabaseCatalogRepository` quando o backend está configurado;
- `PublicCatalogService` da Frente03 já possui implementação real;
- `public-lead-ingest` e `client-area-data` existem como Edge Functions;
- contrato atual da Frente04 continua compatível com o adapter da Frente02.

## 🟠 Dependências externas ainda abertas

### Frente01 / backend

1. sincronizar os deltas funcionais recentes da F2;
2. corrigir `SupabaseFavoritesStore.add()`: hoje o store central usa `upsert`, enquanto as policies observadas de `client_favorites` são SELECT/INSERT/DELETE sem UPDATE; preferir `insert` idempotente com tratamento de unique violation (`23505`) ou solução equivalente sem abrir UPDATE desnecessário;
3. endurecer `public-lead-ingest`: não confiar em `metadata.clientId`/identidade enviada pelo caller; quando houver sessão válida de cliente, derivar o vínculo server-side pelo JWT;
4. manter `client-area-data` consultando somente dados vinculados à identidade autenticada;
5. executar typecheck/build no ambiente suportado pelo projeto.

### Frente03 / integração

- sincronizar a versão atual do catálogo público na integração global, incluindo lookup de código case-insensitive e regras atuais de visibilidade/integridade.

### Dados reais / operação

- telefone oficial da organização para continuação WhatsApp;
- ao menos uma conta real de cliente para QA de Auth/área/favoritos;
- ao menos um item real publicado para QA catálogo/detalhe/favorito;
- ao menos uma conversão/atendimento real para validar interesses e histórico.

## 🔴 Não declarar como validado antes da entrega

- build/typecheck integrado no Node exigido pelo projeto;
- QA browser desktop/mobile;
- E2E Auth → catálogo → favorito → lead → área do cliente → WhatsApp;
- persistência de favorito real com conta real;
- catálogo/detalhe com item operacional real;
- histórico/interesses de atendimento real.

## Ordem de validação assim que os syncs entrarem

1. abrir home e navegar por todas as rotas públicas;
2. validar busca da home e filtros do catálogo;
3. validar um item publicado e seu detalhe;
4. criar/login em conta real de cliente;
5. salvar/remover favorito e confirmar persistência após nova sessão;
6. disparar CTA público e confirmar lead no CRM;
7. confirmar interesses/histórico na área do cliente;
8. configurar telefone oficial e validar continuação para WhatsApp somente após lead aceito;
9. executar QA visual desktop/mobile;
10. executar build/typecheck/E2E e só então promover os itens restantes para verde final.
