# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Integração global

- Branch: `frente-01`
- Status observado pela Frente02: EM ANDAMENTO — produto estruturalmente integrado, QA/build final pendentes.
- Backend dedicado Hárpia ativo.
- `database.types.ts` já foi regenerado e agora inclui `catalog_items` e `client_favorites`.
- `PlatformRuntime` usa `SupabaseCatalogRepository` quando o backend está configurado.
- `IntegratedPublicExperience` injeta `clientId` a partir da sessão autenticada no fluxo legítimo antes da Edge Function.
- Pendências ainda abertas relevantes à F02: sincronizar os hardenings recentes da F2; endurecer `public-lead-ingest` server-side para não confiar em identidade fornecida pelo caller; alinhar idempotência do favorites store ao RLS; executar build/typecheck integrado.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE; QA ESTÁTICO PRATICAMENTE ESGOTADO / SYNC, BUILD E E2E PENDENTES.
- Responsável: chat/agente Frente02.
- Últimos hardenings relevantes:
  - contato nome + WhatsApp antes do backend;
  - favoritos por ID antes do slug, proteção entre sessões, serialização contra clique duplo e invalidação de reload antigo durante mutação;
  - área do cliente ignora resposta obsoleta após troca de conta;
  - shell limita dados pessoais a conta `client` ativa;
  - filtros URL sanitizados, campos textuais limitados e faixa de preço invertida normalizada;
  - defesa contra unidade órfã;
  - lookup público case-insensitive como fallback quando o producer integrado estiver atrasado;
  - faixa de preço pública alinhada às unidades publicadas;
  - localizações agrupadas por cidade na busca da home;
  - metadata de identidade normalizada/bloqueada no adapter público;
  - pipeline preserva sucesso do lead mesmo se somente a continuação externa falhar;
  - texto contextual do WhatsApp normalizado antes do redirecionamento;
  - Error Boundary público para rota malformada;
  - WhatsApp inválido degrada sem derrubar site ou CRM.
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
- Backend conectado estruturalmente: catálogo F3, favoritos Supabase, `public-lead-ingest` e `client-area-data`.
- NÃO VERIFICADO: build/typecheck integrado Node24, browser/E2E, Auth com conta real, catálogo/detalhe com item real, favorito real, WhatsApp real e QA visual.
- Checklist da primeira entrega: `docs/frentes/FRENTE-02-ENTREGA-01.md`.
- Semáforo detalhado: `docs/frentes/FRENTE-02-STATUS.md`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE no runtime da Frente01.
- Contrato público continua compatível com a F2.
- Producer atual filtra unidade sem empreendimento publicado, usa lookup de código case-insensitive e possui reforços de integridade/publicação.
- A F3 também avançou com runtime/repositório realtime; isso não quebra o contrato público da F2.
- A F2 já possui fallback próprio para visibilidade de unidade e lookup case-insensitive, reduzindo a dependência do sync F3 para a jornada pública básica.
- Ainda é recomendada sincronização F3 → F1 para manter producer/runtime globais alinhados.
- QA F2 com dado real pendente enquanto não houver item publicado operacional.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE para site público.
- Contrato atual continua compatível com o adapter F2.
- Avanços recentes observados são internos de workspace/Inbox e não quebram o contrato público.
- Fluxo legítimo F1 injeta `clientId` a partir da sessão; a proteção server-side contra caller direto ainda é pendência do backend/F1.
- QA real pendente por ausência de lead/conta operacional.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Sem bloqueio direto para o escopo público atual da Frente02.

---

# Pedidos entre frentes — Frente02

## F02 → F01 / integrador

- Sincronizar os 12 arquivos funcionais listados acima.
- Urgência: ALTA antes do QA final da primeira entrega.
- Status: PENDENTE DE SYNC.

## F02 → F01 / backend

- Endurecer `public-lead-ingest`: remover/ignorar identidade fornecida em `metadata` pelo caller e, quando houver JWT válido de cliente ativo, derivar `clientId` server-side.
- Motivo: `client-area-data` usa o vínculo do lead para interesses/histórico; proteção precisa existir no servidor, mesmo que o fluxo legítimo já injete o ID a partir da sessão.
- Urgência: ALTA — integridade de dados.
- Status: PENDENTE.

## F02 → F01 / favoritos

- Alinhar `SupabaseFavoritesStore.add()` ao RLS atual.
- Store observado usa `upsert`, enquanto as policies observadas não incluem UPDATE.
- Preferência: `insert` idempotente com tratamento de `23505`, ou solução equivalente sem ampliar UPDATE desnecessário.
- Urgência: MÉDIA/ALTA antes do E2E de favoritos.
- Status: PENDENTE.

## F02 → F03 / integrador

- Sincronizar a versão atual do producer/runtime do catálogo para a integração global.
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
