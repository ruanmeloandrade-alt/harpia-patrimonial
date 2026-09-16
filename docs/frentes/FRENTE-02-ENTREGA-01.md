# Frente02 — Primeira entrega

Data-base: 16/09/2026
Branch: `frente-02`
Objetivo: deixar a experiência pública e a área do cliente prontas para a primeira entrega integrada, sem declarar como validado o que ainda depende de sync, dados reais ou execução em navegador.

## Semáforo executivo

### 🟢 Pronto na Frente02

- home pública e páginas institucionais;
- busca rápida de imóveis com finalidade, cidade, localização e estilo de vida;
- localização da busca da home filtrada pela cidade selecionada, com fallback compatível para readers anteriores;
- filtros sanitizados e compartilháveis por URL, incluindo limpeza de caracteres de controle e limite de tamanho nos campos textuais;
- faixa de preço coerente com unidades publicadas quando um empreendimento possui unidades;
- catálogo público protegido contra unidade órfã sem empreendimento publicado;
- detalhe público com fallback de lookup de código case-insensitive mesmo quando o producer integrado ainda estiver em versão anterior;
- detalhe do imóvel com galeria, vídeo, dados, empreendimento/unidade, serviços relacionados, CTA e favorito;
- captura de proprietário para venda/locação com sucesso somente após conversão aceita;
- retenção de comprador;
- Auth consumido exclusivamente da Frente01;
- isolamento de dados pessoais somente para conta cliente ativa;
- troca de conta não exibe nem transitoriamente interesses/histórico da sessão anterior (`2e099d5`);
- favoritos por ID estável, fallback por slug, proteção de troca de sessão e serialização contra clique duplo;
- troca de conta também oculta imediatamente favoritos da sessão anterior (`77811a9`);
- reload antigo de favoritos não pode sobrescrever mutação já concluída;
- erro de persistência de favorito aparece como aviso global também fora da Área do Cliente, com opção de fechar (`59e62e3`, `4b8b286`);
- área do cliente com perfil, favoritos, interesses, histórico, loading, erro e retry;
- proteção contra respostas assíncronas obsoletas ao trocar de conta;
- adapter F2→F4 compatível com o contrato atual, exigindo nome + WhatsApp;
- metadata pública sanitizada para não enviar identidade confiável pelo body, incluindo variantes equivalentes de chave;
- pipeline registra CRM antes de WhatsApp;
- sucesso do lead permanece válido mesmo se apenas a continuação externa para WhatsApp ou seu callback de diagnóstico falhar, evitando falso negativo na UI;
- mensagem contextual de WhatsApp normaliza/quebra valores de usuário antes de compor o texto;
- WhatsApp mal configurado não derruba o site nem impede criação do lead;
- Error Boundary público para impedir tela branca em URL malformada;
- metadata de página, 404 e navegação mobile;
- nenhum mock permanente ou dado fictício criado para “passar teste”.

## 🟠 Sync/integração que precisa entrar na Frente01

A branch integrada da Frente01 ainda precisa receber os hardenings recentes da Frente02. A comparação atual mostra **12 arquivos funcionais** com delta:

- `src/features/client-area/useClientAreaData.ts`;
- `src/features/public-catalog/contracts.ts`;
- `src/features/public-catalog/front03Adapter.ts`;
- `src/features/public-site/Front02IntegrationShell.tsx`;
- `src/features/public-site/HomeCatalogSearch.tsx`;
- `src/features/public-site/PublicExperience.tsx`;
- `src/features/public-site/PublicExperienceBoundary.tsx`;
- `src/features/public-site/catalogQuery.ts`;
- `src/features/public-site/conversionPipeline.ts`;
- `src/features/public-site/front04ConversionAdapter.ts`;
- `src/features/public-site/usePublicFavoritesBridge.ts`;
- `src/features/public-site/whatsappContinuation.ts`.

## 🟢 Dependências que já deixaram de bloquear

- Supabase dedicado Hárpia ativo;
- Auth/session/RLS do núcleo disponíveis;
- `database.types.ts` da Frente01 regenerado com `catalog_items` e `client_favorites`;
- `PlatformRuntime` usa `SupabaseCatalogRepository` quando o backend está configurado;
- `PublicCatalogService` da Frente03 já possui implementação real;
- F2 já possui defesa própria contra unidade órfã e fallback case-insensitive no detalhe, reduzindo dependência de sync F3 para a jornada pública básica;
- Frente03 evoluiu também para runtime/repositório realtime e validações de mídia sem quebrar o contrato público consumido pela F2;
- `public-lead-ingest` e `client-area-data` existem como Edge Functions;
- contrato atual da Frente04 continua compatível com o adapter da Frente02 mesmo após as refatorações recentes do serviço/Inbox.

## 🟠 Dependências externas ainda abertas

### Frente01 / backend

1. sincronizar os 12 deltas funcionais recentes da F2;
2. corrigir `SupabaseFavoritesStore.add()`: hoje o store central usa `upsert`, enquanto as policies observadas de `client_favorites` são SELECT/INSERT/DELETE sem UPDATE; preferir `insert` idempotente com tratamento de unique violation (`23505`) ou solução equivalente sem abrir UPDATE desnecessário;
3. endurecer `public-lead-ingest`: não confiar em `metadata.clientId`/identidade enviada pelo caller; quando houver sessão válida de cliente, derivar o vínculo server-side pelo JWT;
4. manter `client-area-data` consultando somente dados vinculados à identidade autenticada;
5. executar typecheck/build no ambiente suportado pelo projeto.

### Frente03 / integração

- sincronizar a versão atual do catálogo/realtime na integração global para manter producer e runtime alinhados; a jornada pública básica da F2 já possui fallback local para visibilidade de unidade e lookup de código.

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
6. alternar entre duas sessões/contas e confirmar ausência total de dados transitórios da conta anterior;
7. disparar CTA público e confirmar lead no CRM;
8. confirmar interesses/histórico na área do cliente;
9. configurar telefone oficial e validar continuação para WhatsApp somente após lead aceito;
10. executar QA visual desktop/mobile;
11. executar build/typecheck/E2E e só então promover os itens restantes para verde final.
