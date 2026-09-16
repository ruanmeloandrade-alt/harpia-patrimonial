# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Integração global

- Branch: `frente-01`
- Status observado pela Frente02: EM ANDAMENTO — produto estruturalmente integrado, QA/build final pendentes.
- A Frente01 já incorporou módulos F02/F03/F04/F05, criou `PlatformRuntime`, `IntegratedPublicExperience`, adapters Supabase e roteamento público/interno.
- Backend dedicado Hárpia está ativo.
- Pendências identificadas pela F02: tipos Supabase centrais desatualizados; hardening do `public-lead-ingest` para não confiar em `metadata.clientId`; idempotência do favorites store versus RLS sem UPDATE; sincronização do último fix F2 de captura nome+WhatsApp.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE; QA REAL/BUILD PENDENTES
- Responsável: chat/agente Frente02
- Último fix funcional F02: `5f8f1f3984619b930750bcf301a1d0e30da0a9cd` — exige nome + WhatsApp antes de chamar backend e pré-preenche dados conhecidos.
- Comparação após convergência: o código funcional F02 já estava incorporado à Frente01; após o novo fix, resta apenas `PublicExperience.tsx` como delta funcional a sincronizar.
- Backend conectado estruturalmente: catálogo F03, favoritos Supabase, ingestão pública de lead e `client-area-data`.
- Dados reais atuais observados: 0 perfis, 0 itens de catálogo, 0 publicados, 0 favoritos, telefone da organização nulo, CRM revisão 0.
- NÃO VERIFICADO: build/typecheck integrado Node24, browser/E2E, Auth com conta real, catálogo/detalhe com item real, favoritos real, WhatsApp real e QA visual.
- Detalhes: `docs/frentes/FRENTE-02-STATUS.md`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE no runtime da Frente01 — `PublicCatalogService` real já é injetado em `IntegratedPublicExperience`.
- Validação F02 pendente: banco está sem item publicado real; não criar mock apenas para teste.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE para site público — `public-lead-ingest` e `client-area-data` estão publicados e ligados pela Frente01.
- Pendência de segurança/integridade: `clientId` do histórico deve ser derivado server-side, nunca confiado do body público.
- QA real pendente por ausência de lead/conta real.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Sem bloqueio direto para o escopo público atual da Frente02.

---

# Pedidos entre frentes — Frente02

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01 / integrador
- Necessidade: sincronizar `src/features/public-site/PublicExperience.tsx` do commit F2 `5f8f1f3984619b930750bcf301a1d0e30da0a9cd`.
- Motivo: Edge Function real exige nome + WhatsApp; snapshot integrado só exigia nome antes de pular a captura.
- Urgência: ALTA.
- Status: PENDENTE DE SYNC.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01
- Necessidade: regenerar `src/core/supabase/database.types.ts` com schema atual.
- Motivo: client é `createClient<Database>`, mas arquivo observado não contém `catalog_items`, `client_favorites` e estruturas recentes usadas pelo runtime integrado.
- Urgência: ALTA antes de typecheck/build.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01 / backend
- Necessidade: endurecer Edge Function `public-lead-ingest` para remover `metadata.clientId` fornecido pelo caller e, quando existir Authorization válida de cliente ativo, derivar `clientId` server-side.
- Motivo: `client-area-data` associa interesses/histórico pelo `sourceMetadata.clientId`; confiar no body permite forjar vínculo de lead a outra conta.
- Urgência: ALTA — integridade de dados.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01 / integração de favoritos
- Necessidade: alinhar `SupabaseFavoritesStore.add()` ao RLS atual.
- Motivo: store central usa `upsert`, mas `client_favorites` possui policies RLS de SELECT/INSERT/DELETE e nenhuma policy de UPDATE. Recomendação: `insert` e tratar unique violation `23505`, mantendo UPDATE fechado.
- Urgência: MÉDIA/ALTA antes do E2E de favoritos.
- Status: PENDENTE.

---

# Pendências de integração global relevantes à Frente02

- sincronizar último delta funcional F02 para a branch integrada;
- atualizar tipos Supabase e executar typecheck/build;
- corrigir integridade de `clientId` no lead público;
- alinhar idempotência de favoritos ao RLS;
- cadastrar dados reais mínimos quando disponíveis: conta de cliente, item publicado e telefone oficial;
- executar QA real de Auth → catálogo → favorito → lead → área do cliente → WhatsApp;
- executar QA visual desktop/mobile.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo.
- BLOQUEADA: depende de decisão, dado ou integração externa.
- PRONTA PARA INTEGRAÇÃO: escopo concluído e testado isoladamente.
- INTEGRADA: merge/composição validada no produto conjunto.
