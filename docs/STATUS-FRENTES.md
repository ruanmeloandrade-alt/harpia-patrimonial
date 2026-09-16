# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Integração global

- Branch: `frente-01`
- Status observado pela Frente02: EM ANDAMENTO — produto estruturalmente integrado, QA/build final pendentes.
- A Frente01 já incorporou módulos F02/F03/F04/F05, criou `PlatformRuntime`, `IntegratedPublicExperience`, adapters Supabase e roteamento público/interno.
- Backend dedicado Hárpia está ativo.
- A branch continua avançando em paralelo; os lotes mais recentes observados são majoritariamente F5/runtime interno e não substituem os syncs F2 listados abaixo.
- Pendências identificadas pela F02 ainda abertas: tipos Supabase centrais desatualizados; hardening do `public-lead-ingest` para não confiar em identidade enviada em `metadata`; idempotência do favorites store versus RLS sem UPDATE; sincronização dos hardenings F2 recentes.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status: EM ANDAMENTO — INTEGRADA ESTRUTURALMENTE; QA ESTÁTICO ATIVO / BUILD E E2E PENDENTES
- Responsável: chat/agente Frente02
- Hardening de contato no modal: `5f8f1f3984619b930750bcf301a1d0e30da0a9cd`.
- Favoritos por ID antes do slug: `39f2cd8be0152eaae1e1d840a48b37ad78de9614`.
- Área do cliente ignora resposta obsoleta entre sessões: `6f232a41b41bc48fa833faab39d531587a5dcb27`.
- Favoritos protegidos em troca de sessão: `a231a10e95d4502033832cac4621771d8dc6b220`.
- Shell limita dados pessoais a conta cliente ativa: `14918a0ac99e953d470f16c40630a34e35513ea1`.
- Faixa de preço invertida normalizada: `373e73a4fcf646a4070f85a1594f9a420741defb`.
- Finalidade pública validada/normalizada: `e639a1f55bca413e2460d2c7f192ca497a1d8f62`.
- Adapter F3 bloqueia unidade órfã mesmo com producer antigo: `3845a83699af182fad2c4742c963804ae5649a07`.
- Adapter F4 exige nome+WhatsApp e sanitiza metadata de identidade: `c738140f85d2cc6443f2ff8e6601a0e0dd6550e5`.
- Favoritos serializam mutações por cliente+imóvel: `60ae458a8d01efad99fa6f64cd91971b5ec68860`.
- Error boundary público evita tela branca por rota malformada: `4a5c0377c2bf4b74eae50468c04b887610914194`, `4cc14f4b4c3102ce7e2a1ed080308ba8c58526b6`, `158aceae6a6ab37e611509637ba5cb5ec5934bd6`.
- WhatsApp inválido degrada sem derrubar site/CRM: `d6ef7827d9a5ee47f2f4ab0a37419861892d1f8b`.
- Comparação atual F01 × F02 mostra deltas funcionais em `useClientAreaData.ts`, `front03Adapter.ts`, `Front02IntegrationShell.tsx`, `PublicExperience.tsx`, `PublicExperienceBoundary.tsx`, `catalogQuery.ts`, `front04ConversionAdapter.ts` e `usePublicFavoritesBridge.ts`; precisam ser sincronizados para o produto integrado.
- Backend conectado estruturalmente: catálogo F3, favoritos Supabase, ingestão pública de lead e `client-area-data`.
- Dados reais observados: 0 perfis, 0 itens de catálogo, 0 publicados, 0 favoritos, telefone da organização nulo, CRM revisão 0.
- NÃO VERIFICADO: build/typecheck integrado Node24, browser/E2E, Auth com conta real, catálogo/detalhe com item real, favoritos real, WhatsApp real e QA visual.
- Detalhes: `docs/frentes/FRENTE-02-STATUS.md`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE no runtime da Frente01 — `PublicCatalogService` real já é injetado em `IntegratedPublicExperience`.
- A versão atual da F3 avançou: catálogo público filtra unidades sem empreendimento publicado, `getByIdOrCode` compara código sem diferenciar maiúsculas/minúsculas e a integridade interna evoluiu sem quebrar o contrato público consumido pela F2.
- A cópia observada na Frente01 ainda estava anterior a esses hardenings; precisa sync F3 → integração.
- Validação F02 com dado real continua pendente porque o banco observado está sem item publicado; não criar mock apenas para teste.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Dependência F02: RESOLVIDA ESTRUTURALMENTE para site público — `public-lead-ingest` e `client-area-data` estão publicados e ligados pela Frente01.
- Contrato atual relido e compatível com o adapter F2.
- O último lote observado acrescentou documentação de QA, sem quebra do contrato público.
- Pendência de segurança/integridade central continua: identidade do histórico deve ser derivada server-side, nunca confiada do body público.
- QA real pendente por ausência de lead/conta real.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Sem bloqueio direto para o escopo público atual da Frente02.

---

# Pedidos entre frentes — Frente02

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01 / integrador
- Necessidade: sincronizar os oito arquivos funcionais atuais da F2: `useClientAreaData.ts`, `front03Adapter.ts`, `Front02IntegrationShell.tsx`, `PublicExperience.tsx`, `PublicExperienceBoundary.tsx`, `catalogQuery.ts`, `front04ConversionAdapter.ts` e `usePublicFavoritesBridge.ts`.
- Motivo: correções de contato obrigatório, troca de sessão, estabilidade/concorrência de favoritos, isolamento de cliente, sanitização de filtros e metadata, defesa do catálogo, fallback de rota e degradação segura do WhatsApp.
- Urgência: ALTA antes do QA final.
- Status: PENDENTE DE SYNC.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01
- Necessidade: regenerar `src/core/supabase/database.types.ts` com schema atual.
- Motivo: client é `createClient<Database>`, mas arquivo observado não contém estruturas recentes usadas pelo runtime integrado.
- Urgência: ALTA antes de typecheck/build.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01 / backend
- Necessidade: endurecer Edge Function `public-lead-ingest` para remover identidade fornecida pelo caller em `metadata` e, quando existir Authorization válida de cliente ativo, derivar `clientId` server-side.
- Motivo: `client-area-data` associa interesses/histórico pelo `sourceMetadata.clientId`; confiar no body permite forjar vínculo de lead a outra conta. A F2 já sanitiza seu próprio fluxo, mas a proteção precisa existir no servidor.
- Urgência: ALTA — integridade de dados.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente01 / integração de favoritos
- Necessidade: alinhar `SupabaseFavoritesStore.add()` ao RLS atual.
- Motivo: store central usa `upsert`, mas `client_favorites` possui policies RLS observadas de SELECT/INSERT/DELETE e nenhuma policy de UPDATE. Recomendação: `insert` e tratar unique violation `23505`, mantendo UPDATE fechado.
- Urgência: MÉDIA/ALTA antes do E2E de favoritos.
- Status: PENDENTE.

- Data/hora: 16/09/2026 — QA integrado atual
- Origem: Frente02
- Destino: Frente03 / integrador
- Necessidade: sincronizar a versão atual do `PublicCatalogService` para a integração.
- Motivo: a F3 atual remove unidades órfãs do catálogo público e faz busca de código case-insensitive; a cópia F1 observada ainda não tinha esses hardenings.
- Urgência: ALTA antes do QA de catálogo público.
- Status: PENDENTE DE SYNC.

---

# Pendências de integração global relevantes à Frente02

- sincronizar os oito arquivos funcionais F2 atuais para a branch integrada;
- sincronizar hardenings atuais do catálogo F3;
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
