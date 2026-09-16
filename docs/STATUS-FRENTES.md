# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Integração global

- Branch: `frente-01`
- Status observado pela Frente02: EM ANDAMENTO — produto estruturalmente integrado, QA/build final pendentes.
- Backend dedicado Hárpia ativo.
- `database.types.ts` já foi regenerado e inclui `catalog_items` e `client_favorites`.
- `PlatformRuntime` usa `SupabaseCatalogRepository` quando o backend está configurado.
- `IntegratedPublicExperience` injeta `clientId` a partir da sessão autenticada no fluxo legítimo antes da Edge Function.
- Pendências relevantes à F02: sincronizar os hardenings recentes da F2; endurecer `public-lead-ingest` server-side para não confiar em identidade fornecida pelo caller; alinhar idempotência do favorites store ao RLS; executar build/typecheck integrado.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE; QA ESTÁTICO PRÓPRIO NO LIMITE / SYNC, BUILD E E2E PENDENTES.
- Responsável: chat/agente Frente02.
- Hardening atual inclui:
  - nome + WhatsApp antes do backend;
  - favoritos por ID antes do slug, isolamento entre contas, serialização por item e proteção contra reload antigo;
  - interesses/histórico ocultos imediatamente na troca de conta e também na troca da fonte de dados;
  - erros de favorito visíveis globalmente;
  - shell limitado a conta `client` ativa;
  - filtros URL sanitizados/limitados, faixa invertida normalizada e busca da home limpando seleção obsoleta;
  - defesa contra unidade órfã, faixa de preço coerente e fallback case-insensitive do detalhe;
  - cidade→localização real na busca da home;
  - metadata de identidade removida no adapter público;
  - pipeline preserva sucesso do lead se somente WhatsApp/callback externo falhar;
  - contexto de WhatsApp normalizado;
  - Error Boundary para rota malformada;
  - número WhatsApp inválido degrada sem derrubar site/CRM.
- Comparação atual F01 × F02 mostra **12 arquivos funcionais** com delta a sincronizar:
  1. `src/features/client-area/useClientAreaData.ts`;
  2. `src/features/public-catalog/contracts.ts`;
  3. `src/features/public-catalog/front03Adapter.ts`;
  4. `src/features/public-site/Front02IntegrationShell.tsx`;
  5. `src/features/public-site/HomeCatalogSearch.tsx`;
  6. `src/features/public-site/PublicExperience.tsx`;
  7. `src/features/public-site/PublicExperienceBoundary.tsx`;
  8. `src/features/public-site/catalogQuery.ts`;
  9. `src/features/public-site/conversionPipeline.ts`;
  10. `src/features/public-site/front04ConversionAdapter.ts`;
  11. `src/features/public-site/usePublicFavoritesBridge.ts`;
  12. `src/features/public-site/whatsappContinuation.ts`.
- Backend consultado em 16/09/2026: 0 perfis, 0 itens de catálogo, 0 publicados, 0 favoritos, telefone da organização nulo; estado CRM existente, porém com 0 leads e 0 entradas de histórico.
- Ambiente local disponível: Node `22.16.0`; projeto exige `>=24 <25`, portanto build/typecheck integrado continua NÃO VERIFICADO.
- Checklist da primeira entrega: `docs/frentes/FRENTE-02-ENTREGA-01.md`.
- Semáforo detalhado: `docs/frentes/FRENTE-02-STATUS.md`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE no runtime da Frente01.
- Contrato público continua compatível com a F2.
- Producer atual filtra unidade sem empreendimento publicado, usa lookup de código case-insensitive, possui reforços de publicação/mídia e evoluiu para runtime/repositório realtime.
- A F2 já possui fallback próprio para visibilidade de unidade e lookup case-insensitive, reduzindo a dependência do sync F3 para a jornada pública básica.
- Ainda é recomendada sincronização F3 → F1 para manter producer/runtime globais alinhados.
- QA F2 com dado real pendente enquanto não houver item publicado operacional.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE para site público.
- Contrato atual continua compatível com o adapter F2.
- Refatorações recentes de serviço/Inbox não alteraram o contrato público consumido pela F2.
- Fluxo legítimo F1 injeta `clientId` a partir da sessão; proteção server-side contra caller direto continua pendência do backend/F1.
- QA real pendente por ausência de lead/conta operacional.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Sem bloqueio direto adicional para o site público.
- A própria tela de integrações informa que WhatsApp e Meta permanecem sem conexão real nesta fase; portanto a continuação WhatsApp da F2 continua dependente do dado/configuração oficial.

---

# Pedidos entre frentes — Frente02

## F02 → F01 / integrador

- Sincronizar os 12 arquivos funcionais listados acima.
- Urgência: ALTA antes do QA final da primeira entrega.
- Status: PENDENTE DE SYNC.

## F02 → F01 / backend

- Endurecer `public-lead-ingest`: remover/ignorar identidade fornecida em `metadata` pelo caller e, quando houver JWT válido de cliente ativo, derivar `clientId` server-side.
- Urgência: ALTA — integridade de dados.
- Status: PENDENTE.

## F02 → F01 / favoritos

- Alinhar `SupabaseFavoritesStore.add()` ao RLS atual.
- Store observado usa `upsert`, enquanto as policies observadas não incluem UPDATE.
- Preferência: `insert` idempotente com tratamento de `23505`, ou solução equivalente sem ampliar UPDATE desnecessário.
- Urgência: MÉDIA/ALTA antes do E2E de favoritos.
- Status: PENDENTE.

## F02 → F03 / integrador

- Sincronizar a versão atual do producer/runtime/realtime do catálogo para a integração global.
- A jornada pública básica da F2 já possui fallback para os hardenings críticos observados.
- Urgência: MÉDIA/ALTA antes do QA final com dados reais.
- Status: PENDENTE DE SYNC.

---

# Pendências globais relevantes à Frente02

- sincronizar os 12 arquivos funcionais F2;
- manter producer/runtime atual da F3 alinhado na integração;
- corrigir hardening server-side de identidade no lead público;
- alinhar idempotência de favoritos ao RLS;
- obter dados reais mínimos: conta de cliente, item publicado, atendimento/lead e telefone oficial;
- executar build/typecheck no Node suportado;
- executar QA browser desktop/mobile;
- executar E2E Auth → catálogo → favorito → lead → área do cliente → WhatsApp.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo.
- BLOQUEADA: depende de decisão, dado ou integração externa.
- PRONTA PARA INTEGRAÇÃO: escopo concluído e testado isoladamente.
- INTEGRADA: merge/composição validada no produto conjunto.
