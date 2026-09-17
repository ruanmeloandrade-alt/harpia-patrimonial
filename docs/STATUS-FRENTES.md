# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Integração global

- Branch: `frente-01`.
- Status observado pela Frente02: EM ANDAMENTO — integração funcional bastante avançada; QA/build/publicação final pendentes.
- Backend dedicado Hárpia ativo.
- `database.types.ts` atualizado com catálogo/favoritos.
- `PlatformRuntime` usa runtime Supabase real para catálogo e favoritos.
- A Frente01 já incorporou o código funcional atual da Frente02, inclusive a confirmação visual pós-lead do commit F2 `9d55666`.
- `SupabaseFavoritesStore.add()` usa `insert` e trata `23505`, sem depender de UPDATE no RLS.
- `public-lead-ingest` publicado remove identidade fornecida pelo caller e deriva `clientId` pelo JWT de cliente ativo.
- `client-area-data` publicado exige JWT e filtra somente dados do usuário autenticado.
- Pendências relevantes à F02: publicar/servir a aplicação React integrada, ligar telefone oficial quando existir e executar build/typecheck no Node correto.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`.
- Status: **BLOQUEADA EM PUBLICAÇÃO/QA FINAL — CÓDIGO FUNCIONAL SINCRONIZADO NA F1**.
- Responsável: chat/agente Frente02.
- **Delta funcional F02 → F01: 0 arquivos.**
- O blob de `src/features/public-site/Front02IntegrationShell.tsx` é idêntico nas duas branches (`703700c468b93766be1a0736dc8296d92f66714c`).
- Segurança dos favoritos conferida:
  - RLS ativo;
  - SELECT/DELETE apenas do próprio `auth.uid()`;
  - INSERT exige cliente ativo e item publicado;
  - PK `(client_id,item_id)`;
  - FKs para `user_profiles` e `catalog_items`;
  - Security Advisor: 0 lints.
- Segurança do lead público conferida:
  - `admin_ingest_public_lead` é `SECURITY DEFINER`;
  - EXECUTE limitado a `postgres` e `service_role`;
  - `public-lead-ingest` ativo v3;
  - `client-area-data` ativo v2 com JWT obrigatório.
- Backend reconferido em 17/09/2026: 0 usuários Auth, 0 perfis, 0 itens, 0 publicados, 0 favoritos, CRM revision 0 com 0 leads/0 histórico, outbox 0 e telefone da organização nulo.
- **Bloqueio de publicação:** a branch `gh-pages` continua servindo a landing HTML antiga, com imóveis/bairros/valores fictícios. Ela viola a regra de zero mocks e não representa o React integrado atual da F02.
- O React atual da F02 usa catálogo real/empty state e não contém esse inventário fictício publicado na landing antiga.
- Build/typecheck integrado continua NÃO VERIFICADO no Node exigido `>=24 <25`.
- QA visual/E2E browser continua NÃO VERIFICADO.
- Semáforo detalhado: `docs/frentes/FRENTE-02-STATUS.md`.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`.
- Dependência funcional da F02: RESOLVIDA.
- A Frente01 já contém o código funcional da F3 necessário à experiência pública; deltas recentes observados para F1 eram documentação/handoff.
- Catálogo público cobre unidade órfã, preço por unidades, lookup case-insensitive, integridade/publicação, mídia e realtime.
- QA público com dado real continua pendente porque ainda não há item publicado operacional.

## Frente04 — CRM/Inbox

- Branch: `frente-04`.
- Dependência funcional da F02: RESOLVIDA para conversão pública.
- Contrato `LeadConversionEvent` consumido pela F2 continua compatível.
- Deltas mais novos da F4 observados são internos de CRM/Inbox e não quebram o contrato público da F2.
- QA real da jornada depende de lead/conta operacional.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`.
- Sem bloqueio direto adicional para o site público.
- WhatsApp e Meta reais continuam reservados para a fase final; a continuação WhatsApp da F2 depende do telefone/configuração oficial.

---

# Pedidos entre frentes — Frente02

## F02 → F01 / integrador

- Não há sync funcional pendente da F2.
- Usar `organization_settings.phone` como fonte do telefone oficial quando a operação preencher o número.
- **Remover/substituir a publicação antiga da `gh-pages`, que contém dados fictícios, e servir a aplicação React integrada atual.**
- Executar build/typecheck no Node suportado.

Status: **BLOQUEIO DE PUBLICAÇÃO ABERTO / AGUARDANDO DADOS / QA EXECUTÁVEL**.

---

# Pendências globais relevantes à Frente02

- substituir a landing antiga publicada pela aplicação React integrada;
- obter telefone oficial;
- criar/usar conta operacional de QA;
- ter ao menos um item real publicado;
- ter ao menos um atendimento/lead real;
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
