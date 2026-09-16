# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões + integração global

- Branch: `frente-01`
- Status: **INTEGRADA ESTRUTURALMENTE — F02/F03/F04/F05 LIBERADAS PARA CONTINUAR**
- Último commit funcional de código antes deste status: `603af07f66f52428d9f21de32ef441831eb82ad7`.
- Handoff/QA da F01 atualizado nos commits `d2dd1a6631db55b5e933819f307a3d862e00b48c` e `d4495f2be306555b752c48593e18815f30d33d7a`.
- Backend dedicado Hárpia ativo.
- Núcleo entregue: autenticação cliente/equipe, sessão, cadastro/login/logout/recuperação, guards, usuários, grupos, permissões, overrides individuais, configurações, shell e roteador global.
- Integração F02: experiência pública ligada ao Auth, catálogo, favoritos, área do cliente e ingestão de leads reais; `/conta` protegido antes do caminho legado `/cliente`.
- Integração F03: `createCatalogRuntime` adotado; repository, Realtime e Storage usam o cliente Supabase global; mídia do catálogo injetada na tela interna.
- Integração F04: CRM/Inbox usam estado compartilhado; fila de leads sem etapa está visível; Inbox recebe SalesBots e agentes IA ativos explicitamente; rotas CRM/Inbox aceitam `view OR manage` e o integrador envia capacidades `manage` separadas.
- Integração F05: estado compartilhado, RBAC `view/manage`, `canManage`, engine de automação, runtime IA e integrações server-side compostos no integrador.
- Conversão F02 → F04 ligada; criação de lead não envia mensagem automaticamente.
- Métricas F04 → F03 ligadas sem inventar métricas indisponíveis.
- Eventos/comandos F04 ↔ F05 ligados.
- `src/core/supabase/database.types.ts` regenerado a partir do schema real integrado, incluindo catálogo, favoritos e tabelas/RPCs do worker de automação.

### Liberação

As Frentes02, 03, 04 e 05 **não precisam mais aguardar a Frente01 para continuar o trabalho estrutural**. Os encaixes globais que dependiam da F01 estão disponíveis na `frente-01`.

### Pendências finais da Frente01

Estas pendências permanecem para QA/fase final e **não bloqueiam o avanço das outras frentes**:

- executar build/typecheck quando houver ambiente Node/npm disponível;
- criar os dois usuários temporários de QA já autorizados por caminho oficial do Supabase Auth;
- executar E2E autenticado, persistência e concorrência entre sessões;
- validar e-mail/recovery e redirects finais na etapa posterior já definida;
- ajustes visuais/UX ficam depois da funcionalidade.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Dependência estrutural da Frente01: **LIBERADA**.
- Próximo passo: continuar implementação/QA local usando a composição integrada.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Dependência estrutural da Frente01: **LIBERADA**.
- Próximo passo: continuar QA funcional de catálogo/dashboard; runtime global de catálogo já está encaixado.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Dependência estrutural da Frente01: **LIBERADA**.
- Próximo passo: continuar QA funcional de CRM/Inbox usando leitura `view` e mutações condicionadas a `manage`.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Dependência estrutural da Frente01: **LIBERADA**.
- Próximo passo: continuar QA dos módulos; RBAC e composição global já estão encaixados.

---

# Pedidos entre frentes

- Data: 16/09/2026
- Origem: Frentes02–05
- Destino: Frente01
- Necessidade: fechar encaixes estruturais no shell/runtime global.
- Status: **RESOLVIDO**.

---

# Integração global

## Resolvido estruturalmente

- [x] Auth F01 ↔ F02.
- [x] Catálogo F03 ↔ F02.
- [x] Conversão F02 ↔ lead F04.
- [x] Métricas F04 ↔ dashboard F03.
- [x] Inbox F04 ↔ SalesBot/IA F05.
- [x] Eventos CRM F04 ↔ Automatize F05.
- [x] RBAC F05 ↔ shell F01.
- [x] Realtime/Storage do catálogo F03 ↔ runtime F01.
- [x] Tipos Supabase sincronizados com o schema integrado.

## QA/fase final

- [ ] build/typecheck conjunto.
- [ ] E2E autenticado.
- [ ] multi-sessão/conflito real.
- [ ] e-mail/recovery/redirects finais.
- [ ] WhatsApp real.
- [ ] Meta real.
- [ ] refinamento visual/UX.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo local pronto para composição.
- INTEGRADA ESTRUTURALMENTE: módulos encaixados sem afirmar build/E2E ainda não executados.
- INTEGRADA/VERDE: merge + build + testes reais exigidos concluídos.
