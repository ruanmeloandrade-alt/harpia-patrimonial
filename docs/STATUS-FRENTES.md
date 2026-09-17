# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Observação F05 em 17/09/2026: status autoritativo da F01 permanece **INTEGRADA ESTRUTURALMENTE — F02/F03/F04/F05 LIBERADAS PARA CONTINUAR**.
- F01 mantém shell/runtime compartilhado, RBAC `view/manage`, tipos Supabase e a integração estrutural da F05.
- Atenção de sincronização: comparação atual `frente-01...frente-05` mostra **26 commits da F05 ainda fora da F01**.

## Frente02 — Site público/Área do cliente

- Branch: `frente-02`
- Status autoritativo: consultar a própria branch/chat.

## Frente03 — Catálogo interno/Dashboard

- Branch: `frente-03`
- Status autoritativo: consultar a própria branch/chat.

## Frente04 — CRM/Inbox

- Branch: `frente-04`
- Status autoritativo: consultar a própria branch/chat.
- Contrato F04 ↔ F05 permanece estruturalmente conectado pela F01.

## Frente05 — SalesBot/Automatize/IA/Integrações

- Branch: `frente-05`
- Status: **NÚCLEO F05 🟢 / RUNTIME SERVER-SIDE F05 🟢 / INTEGRAÇÃO ESTRUTURAL F01↔F05 🟢 / SINCRONIZAÇÃO F05→F01 🟠 / QA FINAL AUTENTICADO 🟠**.
- Responsável: chat atual — Frente05.
- Relatório histórico: `docs/frentes/FRENTE-05-TESTES.md`.
- Handoff atual: `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`.

### 🟢 Núcleo F05

- SalesBot: CRUD, blocos, validação, runtime, pausa/retomada, encadeamento e integridade de referências;
- Automatize: gatilhos, condições, ações e motor sequencial;
- Agentes IA: configuração, ativação, runtime e logs sem armazenar prompt/resposta;
- Provedores: OpenAI/Codex, Anthropic/Claude, Gemini e customizado;
- cofre IA via Vault;
- storage compartilhado com optimistic locking, rollback e escrita confirmada;
- RBAC F05 com `view/manage`, `manage => view` e default-deny;
- URL/webhook validation alinhada ao backend;
- proteção contra ciclos A→B→A e exclusão/pausa de recursos ainda referenciados;
- consistência perfil IA ↔ Vault com compensação;
- API pública consolidada em `src/features/automations/index.ts`;
- retomada de delays com `resumeAt`, lease temporário e proteção contra retomada duplicada entre sessões.

### 🟢 Runtime server-side F05

Criado e implantado no Supabase o Edge Function interno `f05-runtime-worker`.

Responsabilidades já implementadas no lado F05:

- `start_salesbot` server-side;
- `invoke_ai` server-side;
- leitura de SalesBots/agentes/perfis a partir do storage compartilhado real;
- persistência de execuções com optimistic locking por `revision`;
- ações CRM via `admin_apply_crm_automation_action`;
- encadeamento de SalesBot com limite de profundidade;
- condições e delays;
- webhooks HTTPS com bloqueio de hosts privados/reservados, DNS validation, redirect manual e timeout;
- execução de OpenAI/Codex, Claude, Gemini e customizado usando credencial resolvida server-side;
- canal de mensagem continua corretamente `not_configured` enquanto WhatsApp real não estiver conectado;
- função aceita somente chamadas internas autenticadas com a chave server-side.

Security Advisor após deploy: 0 lints.

### 🟢 Testes/validações isoladas já registradas

- runtime SalesBot básico;
- command port SalesBot;
- motor Automatize;
- adapters de provedores IA;
- runtime de agente IA;
- storage race/rollback;
- escrita confirmada;
- consistência perfil/Vault;
- integridade de referências/ciclos;
- validação de URLs externas;
- `F05_CONTEXT_RESUME_TEST_OK`;
- `F05_CHAIN_CONTEXT_TEST_OK`.

### 🟢 Integração estrutural confirmada na Frente01

- rotas/sidebar F05;
- RBAC `view OR manage` nas rotas;
- `canManage` explícito nos workspaces;
- gate de hidratação e Realtime;
- CRM → Automatize;
- Inbox → SalesBot/IA;
- SalesBot composto com CRM + IA + condição + webhook;
- Automatize composto com CRM + SalesBot + IA + webhook no runtime interno;
- `ai-model-invoke`;
- `ai-credential-vault` + Supabase Vault;
- worker server-side de eventos;
- tipos Supabase sincronizados com schema integrado.

### 🟠 Sincronização F05 → F01

Comparação atual entre as branches confirma `frente-05` com 26 commits ainda fora de `frente-01`.

Além dos hardenings anteriores, a F05 agora também entrega:

- lease de retomada de delays;
- proteção contra retomada duplicada;
- limpeza correta do lease;
- `f05-runtime-worker` server-side para SalesBot e IA.

O PR #1 continua sendo o canal de integração F05 → F01 e não deve ser forçado se houver conflito com trabalho paralelo da F01.

### 🟠 Pendências reais de QA/fase final

- `auth.users = 0` e perfis internos ativos = 0 na conferência de 17/09/2026;
- o antigo `f01-bootstrap-qa` está encerrado (HTTP 410), portanto a F05 não possui caminho autorizado próprio para criar Auth sem invadir responsabilidade da F01;
- criar admin QA + viewer QA por caminho oficial da F01/Auth;
- E2E autenticado de `view/manage`, RLS, storage, Realtime e cofre;
- build/typecheck consolidado ainda sem aprovação registrada;
- chamada real de IA continua dependendo de uma chave real cadastrada;
- WhatsApp/Meta reais permanecem fase posterior.

### 🟠 Integração do outbox server-side

A lacuna que antes era falta de runtime do lado F05 foi reduzida: `f05-runtime-worker` agora executa `start_salesbot` e `invoke_ai`.

Ainda falta a Frente01 alterar o `automation-event-worker` dela para encaminhar essas duas ações ao novo runtime interno F05. A F05 não deve sobrescrever a Edge Function proprietária da F01 sem coordenação.

### Dependências atuais

- Frente01: sincronizar os 26 commits/hardenings atuais da F05.
- Frente01: conectar `automation-event-worker` → `f05-runtime-worker` para `start_salesbot` e `invoke_ai`.
- Frente01/Auth: criar os dois usuários temporários de QA por caminho oficial.
- Produto/integração: build/typecheck conjunto.
- Frente04: nenhuma mudança nova de contrato exigida neste momento.

### Próximo passo da Frente05

Continuar hardening próprio e validação do runtime server-side. Quando F01 conectar o worker e disponibilizar usuários de QA, executar imediatamente E2E autenticado e fluxo outbox → SalesBot/IA. Não criar dados operacionais falsos, não forçar credenciais e não marcar WhatsApp/Meta como conectados antes da fase real.

---

# Pedidos entre frentes

- F05 → F01 — rotas/sidebar/cofre/runtime interno: **RESOLVIDO**.
- F05 → F01 — sincronizar branch F05: **PENDENTE — 26 commits atuais ainda fora da F01**.
- F05 → F01 — RBAC `view/manage`: **RESOLVIDO**.
- F05 → F01/Auth — usuários temporários de QA: **PENDENTE**.
- F05 → F01 — conectar `automation-event-worker` ao `f05-runtime-worker`: **PENDENTE**.
- F05 ↔ F04 — contratos CRM/Inbox: **ESTRUTURA PRESENTE; E2E PENDENTE**.

---

# Critério de status

- 🔴 não iniciado/não executado;
- 🟠 parcial, dependente ou ainda sem E2E final;
- 🟢 implementado e validado no escopo declarado.
