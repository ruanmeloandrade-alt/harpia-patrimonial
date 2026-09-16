# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Integração global

- Branch: `frente-01`.
- Status observado pela Frente02: EM ANDAMENTO — integração funcional bastante avançada; QA/build/publicação final pendentes.
- Backend dedicado Hárpia ativo.
- `database.types.ts` atualizado com catálogo/favoritos.
- `PlatformRuntime` usa runtime Supabase real para catálogo e favoritos.
- A Frente01 absorveu o head funcional anterior da Frente02.
- `SupabaseFavoritesStore.add()` já usa `insert` e trata `23505`, sem depender de UPDATE no RLS.
- `public-lead-ingest` publicado remove identidade fornecida pelo caller e deriva `clientId` pelo JWT de cliente ativo.
- `client-area-data` publicado exige JWT e filtra somente dados do usuário autenticado.
- Pendências relevantes à F02: sincronizar o único delta novo da F2 (`Front02IntegrationShell.tsx` do commit `9d55666`), publicar/servir a aplicação React integrada e executar build/typecheck no Node correto.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`.
- Status: EM ANDAMENTO — BASE INTEGRADA NA F1; QA DE INTEGRAÇÃO ATIVO; DADOS REAIS / PUBLICAÇÃO / BUILD / E2E PENDENTES.
- Responsável: chat/agente Frente02.
- A F1 já contém todo o lote funcional anterior da F2.
- Delta funcional atual F02 → F01: **1 arquivo**:
  - `src/features/public-site/Front02IntegrationShell.tsx` — confirmação visual após lead aceito quando não houver continuação WhatsApp.
- Último commit funcional F2: `9d55666aeae2b1210325b8dcc8b1277a8690532`.
- Segurança dos favoritos conferida no Supabase:
  - RLS ativo;
  - SELECT/DELETE somente do próprio `auth.uid()`;
  - INSERT exige cliente ativo e item publicado;
  - PK `(client_id,item_id)`;
  - FKs para `user_profiles` e `catalog_items`;
  - Security Advisor: 0 lints.
- Segurança do lead público conferida:
  - `admin_ingest_public_lead` é `SECURITY DEFINER`;
  - EXECUTE limitado a `postgres` e `service_role`;
  - `public-lead-ingest` ativo v3;
  - `client-area-data` ativo v2 com JWT obrigatório.
- Backend consultado em 16/09/2026: 0 perfis, 0 itens, 0 publicados, 0 favoritos, 0 leads, 0 histórico e telefone da organização nulo.
- A `gh-pages` atual representa a landing HTML antiga e não a aplicação React integrada.
- Ambiente desta sessão: Node 22; projeto exige Node `>=24 <25`. Build/typecheck integrado continua NÃO VERIFICADO.
- Checklist detalhado: `docs/frentes/FRENTE-02-STATUS.md`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`.
- Dependência funcional da F02: RESOLVIDA.
- A Frente01 já contém o código funcional atual da F3; os deltas F3 → F1 observados na última comparação eram documentação/handoff.
- Catálogo público atual cobre unidade órfã, preço por unidades, lookup case-insensitive, integridade/publicação, mídia e realtime.
- QA público com dado real continua pendente porque ainda não há item publicado operacional.

## Frente04 — CRM/Inbox

- Branch: `frente-04`.
- Dependência funcional da F02: RESOLVIDA para conversão pública.
- Contrato `LeadConversionEvent` consumido pela F2 continua compatível.
- Deltas mais novos da F4 observados são internos de CRM/Inbox/leitura e não quebram o contrato público da F2.
- QA real da jornada depende de lead/conta operacional.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`.
- Sem bloqueio direto adicional para o site público.
- WhatsApp e Meta reais continuam reservados para a fase final; portanto a continuação WhatsApp da F2 depende do telefone/configuração oficial.

---

# Pedidos entre frentes — Frente02

## F02 → F01 / integrador

- Sincronizar somente o novo `src/features/public-site/Front02IntegrationShell.tsx` do commit `9d55666`.
- Usar `organization_settings.phone` como fonte do telefone oficial quando a operação preencher o número.
- Publicar/servir a aplicação React integrada atual; não usar a landing estática antiga da `gh-pages` como validação.
- Executar build/typecheck no Node suportado.

Status: PENDENTE DE SYNC/PUBLICAÇÃO.

---

# Pendências globais relevantes à Frente02

- sincronizar 1 arquivo funcional novo da F2;
- obter telefone oficial;
- criar/usar conta operacional de QA;
- ter ao menos um item real publicado;
- ter ao menos um atendimento/lead real;
- publicar a aplicação React integrada atual;
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
