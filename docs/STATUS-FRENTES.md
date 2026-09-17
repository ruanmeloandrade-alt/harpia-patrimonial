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
- **Sincronização funcional com a base final: CONCLUÍDA.**

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE03**.
- Catálogo, publicação, Dashboard, Storage, RLS/RBAC e Realtime entregues e validados no backend real.
- Código funcional necessário ao produto integrado já presente na base consolidada.
- Handoff final registrado em `docs/frentes/FRENTE-03-HANDOFF.md`.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE04**.
- CRM/Kanban/Lead 360, Inbox, RBAC, persistência multiusuário, Realtime e contratos F05 concluídos.
- **Sincronização funcional com a base final: CONCLUÍDA.**
- Commit de integração: `b97e99d381e4e3fee1acfde5984127dc6055a4ed`.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status individual: **FINALIZADA NO ESCOPO DA FRENTE05 E INTEGRADA ESTRUTURALMENTE**.
- PR #3 mergeado para conectar `automation-event-worker` ao runtime F05.
- PR #4 mergeado para reconciliar os módulos finais da F05.
- `automation-event-worker` v4 ACTIVE no Supabase.
- `f05-runtime-worker` e `f05-delay-worker` ativos.
- Scheduler durável ativo.

---

# Base final integrada

- [x] Frente01 concluída.
- [x] Frente02 concluída.
- [x] Frente03 concluída.
- [x] Frente04 concluída.
- [x] Frente05 concluída.
- [x] Frentes reconciliadas funcionalmente na base consolidada.
- [x] PR #5 `frente-01 → main` mergeada em 17/09/2026.
- [x] Commit de integração na `main`: `a5b522aac5b1514e396c2d5ca69a49589df08463`.
- [x] `main` definida como fonte de verdade.

As branches `frente-01` a `frente-05` permanecem como histórico. Não fazer merge forçado das branches históricas divergidas.

## QA final integrado — 17/09/2026

🟢 **QA ESTRUTURAL/INTEGRAÇÃO ENCERRADA. PROJETO LIBERADO PARA A PRÓXIMA FASE.**

Detalhamento principal: `docs/QA-FINAL-2026-09-17.md`.
Segunda passada funcional: `docs/QA-FINAL-PASSADA-2-2026-09-17.md`.

### Validado

- [x] Supabase `ACTIVE_HEALTHY`.
- [x] Security Advisor com `0` lints.
- [x] Performance Advisor sem erro bloqueante.
- [x] RBAC/RLS admin/viewer/cliente em teste transacional real.
- [x] autoalteração de segurança bloqueada.
- [x] catálogo: transições, publicação hierárquica e integridade empreendimento/unidade.
- [x] `public-lead-ingest` real: HTTP 201, CRM + outbox, sem envio automático.
- [x] criação de conta de cliente conectada ao CRM via camada de composição; contrato real do Edge/CRM validado.
- [x] ações CRM: etapa, tag, campo e tarefa.
- [x] grafo SalesBot: válido aceito e ciclo rejeitado.
- [x] E2E server-side `CRM → Automatize → SalesBot → runtime F05` concluído.
- [x] delay durável retomado e concluído.
- [x] bloco `message` sem canal real fica `not_configured/paused`, sem falso envio.
- [x] scheduler, Vault/token, Edge Functions, Storage policies e Realtime estrutural conferidos.
- [x] contato público ligado a `organization_settings` sem valor inventado durante a QA.
- [x] limpeza final sem dados temporários de QA.
- [x] base consolidada promovida para `main` via PR #5.
- [x] requisito exclusivo de Node 24 removido; `package.json` aceita `Node >=22.12 <25`.

### Itens NÃO VERIFICADOS que não bloqueiam a próxima fase

- [ ] instalação limpa/reprodutível e `package-lock.json` versionado;
- [ ] `npm run typecheck` e `npm run build` no checkout completo da `main`;
- [ ] E2E autenticado admin/viewer/cliente em navegador;
- [ ] navegação visual desktop/mobile;
- [ ] formulário completo de cadastro em navegador;
- [ ] catálogo interno → publicação → site público pela UI;
- [ ] upload real de mídia pela UI;
- [ ] Realtime observado em duas sessões simultâneas;
- [ ] sessão/reload/fechar-reabrir navegador;
- [ ] e-mail/recovery/redirects finais;
- [ ] console do navegador sem erros relevantes;
- [ ] validação visual final do usuário.

Esses itens migram para a fase funcional/visual, integração externa e publicação. Devem ser verificados junto das correções reais e não como uma auditoria isolada que paralise o projeto.

---

## Avanços da fase funcional / integração — 17/09/2026

- [x] Dados públicos reais da empresa configurados no Supabase: WhatsApp/telefone, e-mail e Rio de Janeiro/RJ.
- [x] Número público armazenado em formato internacional para compatibilidade com `wa.me`.
- [x] `public-organization-contact` já lê o telefone real de `organization_settings`.
- [x] Pipeline público mantém a ordem correta: captura o lead no CRM e depois continua para WhatsApp com contexto.
- [x] CTA `Ser Atendido Agora!` incluído também no menu mobile usando o mesmo fluxo real de captura.
- [x] Configurações internas deixam explícito qual telefone alimenta os CTAs públicos.
- [x] Interface passou a distinguir `WhatsApp público` de `WhatsApp API`.
- [x] Navegação da área interna passou a ser recolhível em tablet/mobile, evitando empurrar os módulos para baixo da sidebar completa.
- [x] Busca principal da home agora contempla finalidade, cidade, localização, lançamento, faixa de preço e estilo de vida com opções derivadas do catálogo real.
- [x] Login/cadastro público preservam a rota de origem; usuário que autentica a partir de um imóvel volta ao contexto original em vez de cair obrigatoriamente em `/cliente`.
- [x] Retorno pós-auth é restrito a caminhos internos do próprio site e bloqueia destino externo/área interna indevida.

**WhatsApp público/click-to-chat está configurado. WhatsApp API para Inbox/envios/automações e Meta continuam como integrações externas da fase final e não são tratados como conectados.**

---

# Próxima fase

A partir daqui o trabalho deve priorizar:

1. front-end e posicionamento de botões;
2. fluxos reais de uso;
3. dados reais;
4. integrações reais;
5. validação visual/E2E durante as correções;
6. preparação de publicação.

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo.
- BLOQUEADA: depende de decisão ou recurso externo indispensável.
- PRONTA PARA INTEGRAÇÃO: escopo local pronto para composição.
- INTEGRADA ESTRUTURALMENTE: módulos encaixados sem afirmar testes ainda não executados.
- FINALIZADA NO ESCOPO: implementação e QA executáveis da frente concluídos.
- LIBERADA PARA PRÓXIMA FASE: QA estrutural suficiente para avançar, mantendo explicitamente como `NÃO VERIFICADO` o que só pode ser confirmado no fluxo visual/integrado final.
