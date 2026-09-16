# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Observação da Frente05 em 16/09/2026: a branch da Frente01 já possui shell interno, autenticação/RBAC, permissões dos módulos e backend Supabase ativo. O status autoritativo da Frente01 permanece na própria branch `frente-01`.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status autoritativo: consultar a própria branch/chat da Frente02.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status autoritativo: consultar a própria branch/chat da Frente03.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status autoritativo: consultar a própria branch/chat da Frente04.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status: EM ANDAMENTO — Frente01 destravou backend/RBAC; integração de shell e CRM/Inbox ainda pendentes.
- Responsável: chat atual — Frente05
- Último commit relevante de integração antes deste status: `ee685f5ce6cd1a1d5a1dabbb6716cc5451542e75`
- Relatório de testes: `docs/frentes/FRENTE-05-TESTES.md`
- Handoff para Frente01: `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`
- Entregue no núcleo F05: contratos CRM/Inbox; CRUD e editor de SalesBot; catálogo completo de blocos; validação e referências cruzadas; runtime retomável; Automatize com gatilhos, condições, ações e motor; agentes IA; logs; provedores configuráveis; adaptadores OpenAI/Codex, Anthropic/Claude, Gemini e customizado; workspace consolidado e API pública.
- Novo após desbloqueio da Frente01: mapa RBAC compatível com `salesbot.*`, `automations.*`, `ai.*` e `integrations.*`; abas ocultas sem permissão de leitura; modo somente leitura quando existe `view` sem `manage`; adaptador `createSupabaseAICredentialVault` para o cliente Supabase da Frente01.
- Cofre real IA: migration aplicada no Supabase real da Hárpia; schema privado `private_f05`; segredo armazenado no Supabase Vault; RPCs restritas a `service_role`; round-trip salvar -> resolver -> remover testado; 0 resíduos do segredo de teste; Security Advisor = 0 lints após hardening.
- Edge Function IA: `ai-credentials` publicada, `ACTIVE`, `verify_jwt = true`, exige usuário autenticado + `integrations.manage`; nunca devolve chave bruta ao navegador.
- Segurança: API key não é persistida em `localStorage`, código ou documentação. O navegador recebe somente `secretRef` após armazenamento confirmado pelo backend.
- NÃO VERIFICADO AINDA: build Vite conjunto; navegação visual da F05 no shell; E2E de RBAC com usuário interno real; salvar/remover chave pela tela com administrador real; CRM/Inbox reais da Frente04; chamada real ao provedor com chave do cliente.
- Em andamento: handoff de montagem para Frente01 e preparação para integração final.
- Bloqueios atuais: `AppRouter.tsx` e `InternalShell.tsx` pertencem à Frente01; CRM/Inbox pertencem à Frente04. O primeiro administrador real ainda é necessário para E2E autenticado do cofre.
- Próximo passo Frente01: montar as rotas/sidebar conforme `docs/frentes/FRENTE-05-INTEGRACAO-F01.md` e passar `buildFront05Access(auth.hasPermission)` + `createSupabaseAICredentialVault(requireSupabase())` ao workspace.
- Próximo passo Frente04: consumir `createSalesBotCommandPort`/`AIAgentCommandPort` na Inbox e emitir `CrmAutomationEvent` para `processCrmAutomationEvent`.

---

# Pedidos entre frentes

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente05
- Destino: Frente01
- Necessidade: montar/importar `Front05Workspace` na navegação interna da plataforma usando a API pública `src/features/automations/index.ts`.
- Arquivo/contrato afetado: `AppRouter.tsx` e `InternalShell.tsx` da Frente01.
- Motivo: liberar navegação/teste visual integrado.
- Urgência: alta para integração.
- Status: PENDENTE — contrato e instruções F05 já entregues em `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`.

- Data/hora: 16/09/2026 12:10 BRT
- Origem: Frente05
- Destino: Frente04
- Necessidade: consumir `createSalesBotCommandPort`/`AIAgentCommandPort` pela Inbox e emitir eventos CRM conforme `CrmAutomationEvent` para `processCrmAutomationEvent`.
- Arquivo/contrato afetado: `src/features/automations/contracts.ts` e `src/features/automations/index.ts`.
- Motivo: integração ponta a ponta CRM/Inbox ↔ automações/SalesBot/IA sem acoplamento.
- Urgência: alta para integração final.
- Status: PENDENTE.

- Data/hora: 16/09/2026 12:24 BRT
- Origem: Frente05
- Destino: Frente01
- Necessidade original: fornecer backend/cofre seguro para credenciais IA.
- Resultado: Supabase/Vault + Edge Function `ai-credentials` implementados pela Frente05 usando o backend disponibilizado pela Frente01; adaptador frontend público entregue.
- Status: RESOLVIDO NO BACKEND. Pendente somente E2E autenticado após existir administrador real e workspace montado.

---

# Pendências de integração global

- Integrar autenticação da Frente01 com área do cliente da Frente02.
- Integrar catálogo publicado da Frente03 com busca pública da Frente02.
- Integrar eventos de conversão da Frente02 com criação de lead da Frente04.
- Integrar métricas CRM da Frente04 no dashboard da Frente03.
- Integrar comandos Inbox da Frente04 com SalesBot/IA da Frente05.
- Integrar eventos CRM da Frente04 com Automatize da Frente05.
- Montar `Front05Workspace` no shell/roteador da Frente01.
- Executar E2E autenticado do cofre IA após criação do primeiro administrador real.
- Executar build/teste visual conjunto após montagem das frentes.
- Conectar WhatsApp e Meta somente na fase final.

---

# Critério de status

- NÃO INICIADA: nenhuma implementação relevante começou.
- EM ANDAMENTO: há trabalho ativo na branch.
- BLOQUEADA: depende de decisão ou contrato externo.
- PRONTA PARA INTEGRAÇÃO: escopo da frente concluído e testado isoladamente.
- INTEGRADA: merge validado no produto conjunto.
