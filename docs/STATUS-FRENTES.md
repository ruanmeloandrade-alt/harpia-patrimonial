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
- Não há desenvolvimento individual obrigatório aberto.
- **Integração ainda pendente:** a branch atual da F02 possui deltas funcionais mais novos que a `frente-01`, principalmente na experiência pública/roteamento/conversão. Esses deltas devem ser reconciliados na passada final sem merge forçado da branch histórica divergida.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE03**.
- Catálogo, publicação, Dashboard, Storage, RLS/RBAC e Realtime entregues e validados no backend real.
- O código funcional necessário ao produto integrado já está presente na `frente-01`.
- Handoff final registrado em `docs/frentes/FRENTE-03-HANDOFF.md`.
- Marcador `.f03-work-in-progress` removido no encerramento.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE04**.
- CRM/Kanban/Lead 360, Inbox, RBAC, persistência multiusuário, Realtime e contratos F05 concluídos.
- Não há implementação individual obrigatória aberta.
- **Integração ainda pendente:** a branch atual da F04 possui deltas funcionais mais novos que a `frente-01`, incluindo atomicidade CRM↔Automatize, cleanup/runtime e preservação de seleção na Inbox. Esses deltas devem ser reconciliados na passada final.

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

# Situação antes da passada final

## Desenvolvimento individual

- [x] Frente01 concluída.
- [x] Frente02 concluída.
- [x] Frente03 concluída.
- [x] Frente04 concluída.
- [x] Frente05 concluída.

**Não há frente individual que precise continuar desenvolvimento genérico antes da integração final.**

## Reconciliação ainda necessária na base integrada

- [ ] absorver de forma isolada os deltas finais da Frente02 na `frente-01`;
- [ ] absorver de forma isolada os deltas finais da Frente04 na `frente-01`;
- [x] Frente03 sem delta funcional de domínio pendente;
- [x] Frente05 já reconciliada na `frente-01`.

Não fazer merge forçado de branches historicamente divergidas. Reconciliar somente arquivos/deltas pertencentes a cada frente sobre a head atual da `frente-01`.

## QA final integrado

Depois da reconciliação F02/F04:

- [ ] `npm run typecheck` com Node `>=24 <25`;
- [ ] `npm run build` com Node `>=24 <25`;
- [ ] E2E autenticado admin/viewer/cliente;
- [ ] navegação visual desktop/mobile;
- [ ] catálogo interno → publicação → site público;
- [ ] upload real de mídia;
- [ ] Realtime com duas sessões;
- [ ] CRM/Inbox ↔ Automatize/SalesBot/IA ponta a ponta;
- [ ] sessão/reload/concorrência;
- [ ] e-mail/recovery/redirects finais;
- [ ] validação visual final do usuário.

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
