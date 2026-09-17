# Hárpia Patrimonial — Status das 5 Frentes

Atualização: 17/09/2026

## Frente01 — Núcleo/Auth/Usuários/Permissões + integração global

- Branch: `frente-01`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE01**.
- Auth/RBAC, usuários, grupos, permissões, sessão, shell e runtime global entregues.
- QA backend real executado anteriormente com usuários temporários e limpeza ao final.
- Security Advisor sem lints na última verificação registrada.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE02**.
- Site público, catálogo público, área do cliente, favoritos, captação e conversão entregues.
- **Sincronização funcional com a `frente-01`: CONCLUÍDA.**
- Conferência por árvore Git confirmou que `client-area`, `public-catalog` e `public-site` da base integrada já possuem os mesmos blobs finais relevantes da F02. Nenhum merge bruto da branch divergida foi necessário.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE03**.
- Catálogo, publicação, Dashboard, Storage, RLS/RBAC e Realtime entregues e validados no backend real.
- Código funcional necessário ao produto integrado já presente na `frente-01`.
- Handoff final registrado em `docs/frentes/FRENTE-03-HANDOFF.md`.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE04**.
- CRM/Kanban/Lead 360, Inbox, RBAC, persistência multiusuário, Realtime e contratos F05 concluídos.
- **Sincronização funcional com a `frente-01`: CONCLUÍDA.**
- Commit de integração: `b97e99d381e4e3fee1acfde5984127dc6055a4ed`.
- Foram absorvidos isoladamente os seis deltas finais:
  - `src/app/PlatformRuntime.tsx`;
  - `src/app/integrations/sharedStateRepositories.ts`;
  - `src/features/crm/front05Adapter.ts`;
  - `src/features/crm/repository.ts`;
  - `src/features/inbox/InboxWorkspaceCore.tsx`;
  - `src/features/settings/core/settings-service.ts`.
- A árvore foi reconferida depois do fast-forward e os seis blobs da F04 já são exatamente os da base integrada.
- O workflow temporário `f04-check.yml` não foi trazido porque `AGENTS.md` proíbe GitHub Actions neste projeto.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE05 E INTEGRADA ESTRUTURALMENTE**.
- PR #3 mergeado para conectar `automation-event-worker` ao runtime F05.
- PR #4 mergeado para reconciliar os módulos finais da F05.
- `automation-event-worker` v4 ACTIVE no Supabase.
- `f05-runtime-worker` e `f05-delay-worker` ativos.
- Scheduler durável ativo.
- PR #1 amplo/divergido fechado como obsoleto.

---

# Base final integrada

## Desenvolvimento individual

- [x] Frente01 concluída.
- [x] Frente02 concluída.
- [x] Frente03 concluída.
- [x] Frente04 concluída.
- [x] Frente05 concluída.

## Sincronização da base integrada

- [x] Frente02 reconciliada funcionalmente na `frente-01`.
- [x] Frente03 sem delta funcional pendente.
- [x] Frente04 reconciliada funcionalmente na `frente-01`.
- [x] Frente05 reconciliada funcionalmente na `frente-01`.

Não fazer merge forçado das branches históricas divergidas. A `frente-01` atual é a fonte de verdade para a etapa final.

## QA final integrado — 17/09/2026

🟠 **PARCIAL / EM ANDAMENTO** — backend e E2E server-side validados; build/typecheck e navegador real ainda `NÃO VERIFICADO`.

Detalhamento completo: `docs/QA-FINAL-2026-09-17.md`.

### Validado nesta passada

- [x] Supabase `ACTIVE_HEALTHY`.
- [x] Security Advisor com `0` lints.
- [x] Performance Advisor sem erro bloqueante; somente índices ainda sem uso em base vazia.
- [x] RBAC/RLS admin/viewer/cliente em teste transacional real.
- [x] autoalteração de segurança bloqueada.
- [x] catálogo: transições, publicação hierárquica e integridade empreendimento/unidade.
- [x] `public-lead-ingest` real: HTTP 201, CRM + outbox, sem envio automático.
- [x] ações CRM: etapa, tag, campo e tarefa.
- [x] grafo SalesBot: válido aceito e ciclo rejeitado.
- [x] E2E `CRM → Automatize → SalesBot → runtime F05` concluído.
- [x] delay durável retomado e concluído.
- [x] bloco `message` sem canal real fica `not_configured/paused`, sem falso envio.
- [x] scheduler, Vault/token, Edge Functions, Storage policies e Realtime estrutural conferidos.
- [x] contato público real responde sem inventar telefone (`phone=null`).
- [x] limpeza final: nenhum usuário, lead, imóvel, bot, automação ou execução QA permaneceu.

### Ainda NÃO VERIFICADO

- [ ] `npm run typecheck` com Node `>=24 <25`;
- [ ] `npm run build` com Node `>=24 <25`;
- [ ] instalação limpa/reprodutível e geração/confirmação de `package-lock.json`;
- [ ] E2E autenticado admin/viewer/cliente em navegador;
- [ ] navegação visual desktop/mobile;
- [ ] catálogo interno → publicação → site público pela UI;
- [ ] upload real de mídia pela UI;
- [ ] Realtime observado em duas sessões simultâneas;
- [ ] sessão/reload/fechar-reabrir navegador;
- [ ] e-mail/recovery/redirects finais;
- [ ] console do navegador sem erros relevantes;
- [ ] validação visual final do usuário.

Motivo do bloco de build/E2E visual neste ambiente: Node disponível `v22.16.0`, enquanto o projeto exige Node `>=24 <25`; o checkout direto do GitHub também falhou por indisponibilidade de DNS externo. Nenhum desses itens foi marcado artificialmente como aprovado.

WhatsApp e Meta reais continuam reservados para a fase final definida no briefing e não devem ser simulados como conectados.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo local pronto para composição.
- INTEGRADA ESTRUTURALMENTE: módulos encaixados sem afirmar build/E2E ainda não executados.
- FINALIZADA NO ESCOPO: implementação e QA executáveis da frente concluídos; validações finais de ambiente ficam para a etapa global.
- INTEGRADA/VERDE: reconciliação + build + testes reais exigidos concluídos.
