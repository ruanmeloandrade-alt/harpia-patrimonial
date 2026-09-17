# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões + integração global

- Branch: `frente-01`
- Status: **FINALIZADA NO ESCOPO DA FRENTE01 — F02/F03/F04/F05 LIBERADAS PARA TRABALHAR**
- Backend dedicado Hárpia ativo.
- Núcleo entregue: autenticação cliente/equipe, sessão, cadastro/login/logout/recuperação, guards, usuários, grupos, permissões, overrides individuais, configurações, shell e roteador global.
- QA real executado com usuários temporários: admin `22` permissões; viewer `11` permissões de leitura e `0` gestão; sessões confirmadas por `auth.getUser()`.
- Dados temporários removidos após o teste: `auth.users=0`, `user_profiles=0`, grupos QA=0, memberships=0, overrides=0.
- Bug de detecção de `service_role` no hardening encontrado e corrigido; fix versionado no commit `af09b2faa7e072125ccb2fc1c91ab74c0d9ab39c`.
- Security Advisor final: `0` lints.
- Função temporária `f01-bootstrap-qa` encerrada: responde `410` e voltou a exigir JWT.
- Integração F02: experiência pública ligada ao Auth, catálogo, favoritos, área do cliente e ingestão de leads reais.
- Integração F03: runtime de catálogo, Realtime e Storage ligados ao Supabase global.
- Integração F04: CRM/Inbox em estado compartilhado; rotas aceitam `view OR manage`; mutações recebem capacidades `manage` separadas.
- Integração F05: RBAC `view/manage`, estado compartilhado, engine de automação, runtime IA e integrações compostos no integrador.

### Liberação

As Frentes02, 03, 04 e 05 **devem continuar o trabalho imediatamente e não devem aguardar a Frente01**. A dependência estrutural está encerrada.

### QA final de ambiente/publicação

Não bloqueia outras frentes e será feito quando houver ambiente executável/publicado:

- build/typecheck conjunto;
- persistência de sessão em navegador real após fechar/reabrir;
- e-mail/recovery e redirects finais;
- E2E visual no produto publicado.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Dependência estrutural da Frente01: **LIBERADA**.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Dependência estrutural da Frente01: **LIBERADA**.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Dependência estrutural da Frente01: **LIBERADA**.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Dependência estrutural da Frente01: **LIBERADA**.

---

# Pedidos entre frentes

- Origem: Frentes02–05
- Destino: Frente01
- Necessidade: encaixes estruturais no shell/runtime global.
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
- [x] QA backend Auth/RBAC F01 com usuários temporários reais.
- [x] Security Advisor F01 sem lints.
- [x] Frente01 encerrada como dependência das demais frentes.

## QA/fase final de ambiente

- [ ] build/typecheck conjunto.
- [ ] E2E visual/browser real.
- [ ] multi-sessão/conflito real em navegador.
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
- FINALIZADA NO ESCOPO: implementação e QA executáveis da frente concluídos; validações finais de ambiente ficam para a etapa global.
- INTEGRADA/VERDE: merge + build + testes reais exigidos concluídos.
