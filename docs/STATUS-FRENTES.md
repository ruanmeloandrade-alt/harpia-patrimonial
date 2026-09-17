# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- F01 mantém shell/runtime compartilhado, RBAC `view/manage`, tipos Supabase e integração estrutural da F05.
- As branches F01 e F05 continuam avançando em paralelo; a contagem exata de commits deve ser conferida no momento da integração.
- PR F05→F01 continua como handoff oficial; não forçar merge nem sobrescrever trabalho paralelo.

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
- Status: **NÚCLEO 🟢 / RUNTIME SERVER-SIDE 🟢 / DELAY DURÁVEL 🟢 / INTEGRAÇÃO F01 🟠 / QA AUTENTICADO 🟠**.
- Relatório de testes: `docs/frentes/FRENTE-05-TESTES.md`.
- Handoff: `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`.

### 🟢 Núcleo F05

- SalesBot: CRUD, blocos, validação, runtime, pausa/retomada, encadeamento e integridade de referências;
- Automatize: gatilhos, condições, ações e motor sequencial;
- Agentes IA: configuração, ativação, runtime e logs sem armazenar prompt/resposta;
- Provedores: OpenAI/Codex, Anthropic/Claude, Gemini e customizado;
- cofre IA via Vault;
- storage compartilhado com optimistic locking, rollback e escrita confirmada;
- RBAC F05 com `view/manage`, `manage => view` e default-deny;
- proteção contra ciclos e exclusão/pausa de recursos referenciados;
- consistência perfil IA ↔ Vault com compensação;
- API pública consolidada em `src/features/automations/index.ts`.

### 🟢 Runtime server-side F05

- `f05-runtime-worker` implantado e ACTIVE;
- `start_salesbot` server-side;
- `invoke_ai` server-side;
- ações CRM;
- condições;
- webhook com SSRF hardening;
- encadeamento de SalesBots;
- credencial IA resolvida somente server-side;
- chamada não autorizada ao runtime retorna `401`.

### 🟢 Scheduler durável de delays

- `f05-delay-worker` implantado e ACTIVE;
- `pg_cron` + `pg_net` ativos;
- job `f05-delay-resume-30s` ativo a cada 30 segundos;
- token interno no Supabase Vault;
- endpoint rejeita token inválido com `401`;
- lease/claim impede retomada simultânea;
- código e schema versionados em GitHub.

Teste funcional real em 17/09/2026:

- execução temporária `paused/next_block` vencida foi retomada no backend;
- avançou para `finish` e terminou `completed`;
- teste adicional retomou um SalesBot pai, chamou `f05-runtime-worker`, executou SalesBot filho e ambos terminaram `completed`;
- todos os fixtures foram removidos após os testes;
- coleções `salesbots` e `salesbot-executions` voltaram a zero itens.

### 🟢 Segurança/backend

- Security Advisor: 0 lints na última conferência;
- scheduler RPC restrito a `service_role`/postgres;
- runtime server-side exige bearer da service role;
- scheduler usa segredo dedicado do Vault e valida hash server-side;
- endpoints externos exigem HTTPS e bloqueiam redes internas/reservadas e redirects.

### 🟠 Integração F05 → F01

A F01 ainda precisa absorver os hardenings e componentes server-side F05 sem sobrescrever mudanças próprias.

Lacuna operacional no `automation-event-worker` da F01:

- CRM: conectado;
- webhook: conectado;
- `start_salesbot`: ainda `not_configured`;
- `invoke_ai`: ainda `not_configured`.

A F05 já disponibiliza `f05-runtime-worker` para essas duas ações e documentou o contrato de integração.

### 🟠 QA autenticado

Conferência real em 17/09/2026:

- `auth.users = 0`;
- `user_profiles` ativos = 0;
- `admin-user` usa fluxo oficial do Supabase Auth, mas exige chamador autenticado com `users.manage`;
- não será criado bypass nem feito insert direto em `auth.users`.

As 8 permissões F05 existem no backend:

- `salesbot.view` / `salesbot.manage`;
- `automations.view` / `automations.manage`;
- `ai.view` / `ai.manage`;
- `integrations.view` / `integrations.manage`.

Grupo de sistema `Administrador` está ativo e possui as 8 permissões F05.

### 🟠 Pendências finais reais

- sincronização F05 → F01;
- ligar `automation-event-worker` da F01 ao `f05-runtime-worker`;
- primeiro admin QA pelo fluxo oficial de Auth;
- E2E autenticado de RBAC/RLS/UI;
- build/typecheck consolidado;
- chamada real a provedor IA com chave real;
- WhatsApp real;
- Meta real.

---

# Pedidos entre frentes

- F05 → F01 — rotas/sidebar/cofre/runtime estrutural: **RESOLVIDO HISTORICAMENTE**.
- F05 → F01 — sincronizar hardenings/componentes atuais: **PENDENTE**.
- F05 → F01 — conectar worker de automações ao runtime server-side F05: **PENDENTE**.
- F05 → F01/Auth — usuários temporários QA: **PENDENTE DE CAMINHO OFICIAL COM ADMIN AUTENTICADO**.
- F05 ↔ F04 — contratos CRM/Inbox: **ESTRUTURA PRESENTE; E2E PENDENTE**.

---

# Critério de status

- 🔴 não iniciado/não executado;
- 🟠 parcial, dependente ou ainda sem E2E final;
- 🟢 implementado e validado no escopo declarado.
