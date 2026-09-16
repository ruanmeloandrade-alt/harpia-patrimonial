# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- Observação F05 em 16/09/2026: status autoritativo da F01 está como **INTEGRADA ESTRUTURALMENTE — F02/F03/F04/F05 LIBERADAS PARA CONTINUAR**.
- F01 já incorporou a F05 atual, corrigiu RBAC `view/manage`, sincronizou tipos Supabase e mantém shell/runtime compartilhado.

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
- Status: **NÚCLEO F05 🟢 / INTEGRAÇÃO ESTRUTURAL F01↔F05 🟢 / QA FINAL AUTENTICADO 🟠**.
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
- API pública consolidada em `src/features/automations/index.ts`.

### 🟢 Testes isolados relevantes aprovados

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

### 🟠 Pendências reais de QA/fase final

- `auth.users = 0` e usuários internos ativos = 0 na última conferência;
- criar admin QA + viewer QA já autorizados;
- E2E autenticado de `view/manage`, RLS, storage, Realtime e cofre;
- build/typecheck consolidado ainda sem aprovação registrada;
- chamada real de IA depende de chave real;
- WhatsApp/Meta reais permanecem fase posterior.

### 🟠 Lacuna server-side observada

O `automation-event-worker` já executa CRM e webhook, mas ainda retorna `not_configured` para:

- `start_salesbot`;
- `invoke_ai`.

Portanto, automação disparada pelo outbox server-side ainda não deve ser considerada ponta a ponta para essas duas ações. O caminho interno/browser já possui SalesBot/IA conectados.

### Dependências atuais

- Frente01/Auth: criar os dois usuários temporários de QA quando houver caminho oficial de Auth disponível.
- Produto/integração: build/typecheck conjunto.
- Frente01/F05: definir se `start_salesbot` e `invoke_ai` server-side entram nesta primeira entrega; se sim, ligar o worker.
- Frente04: nenhuma mudança nova de contrato exigida neste momento.

### Próximo passo da Frente05

Continuar QA/hardening independente enquanto possível. Assim que usuários de QA aparecerem, executar E2E autenticado imediatamente. Não criar dados operacionais falsos, não forçar credenciais e não marcar WhatsApp/Meta como conectados antes da fase real.

---

# Pedidos entre frentes

- F05 → F01 — rotas/sidebar/cofre/runtime: **RESOLVIDO**.
- F05 → F01 — sincronizar branch F05: **RESOLVIDO**.
- F05 → F01 — RBAC `view/manage`: **RESOLVIDO**.
- F05 → F01/Auth — usuários temporários de QA: **PENDENTE**.
- F05 ↔ F01 — SalesBot/IA no worker server-side: **PENDENTE/DECISÃO DE ESCOPO**.
- F05 ↔ F04 — contratos CRM/Inbox: **ESTRUTURA PRESENTE; E2E PENDENTE**.

---

# Critério de status

- 🔴 não iniciado/não executado;
- 🟠 parcial, dependente ou ainda sem E2E final;
- 🟢 implementado e validado no escopo declarado.
