# Hárpia Patrimonial — Status das 5 Frentes

Atualizar este arquivo ao iniciar e ao concluir blocos relevantes.

## Frente01 — Núcleo/Auth/Usuários/Permissões

- Branch: `frente-01`
- F01 mantém shell/runtime compartilhado, RBAC `view/manage`, tipos Supabase e integração estrutural da F05.
- As branches F01 e F05 continuam avançando em paralelo; a contagem exata deve ser conferida no momento da integração.
- PR #1 permanece como handoff amplo F05→F01; não forçar merge da branch divergida.
- PR #3 é o patch mínimo preferencial para o `automation-event-worker`: 1 commit, 1 arquivo, criado diretamente sobre a F01 atual e `mergeable=true` na última conferência.

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
- Status: **NÚCLEO 🟢 / RUNTIME SERVER-SIDE 🟢 / DELAY DURÁVEL 🟢 / SEGURANÇA BACKEND 🟢 / PATCH WORKER F01 PRONTO 🟢 / INTEGRAÇÃO F01 🟠 / QA AUTENTICADO 🟠**.
- Testes: `docs/frentes/FRENTE-05-TESTES.md`.
- Handoff: `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`.

### 🟢 Entrega própria F05

- SalesBot CRUD/blocos/validação/runtime;
- pausa/retomada com contexto;
- lease concorrente;
- Automatize;
- agentes/provedores IA;
- Vault;
- storage compartilhado;
- integridade de referências;
- SSRF hardening;
- `f05-runtime-worker` ACTIVE;
- `f05-delay-worker` ACTIVE;
- cron durável de 30 s;
- `start_salesbot` e `invoke_ai` server-side;
- integrações com estados explícitos `not_connected`, `pending`, `future` e `connected`;
- logs de SalesBot exibem bot, status, lead, conversa, bloco, agente IA, ação e erro.

### 🟢 Testes backend reais

- delay vencido retomado até `completed`;
- dois delays consecutivos retomados corretamente até `completed`;
- corrida com dois workers simultâneos: um processou e o outro foi bloqueado pelo lease, sem duplicação;
- caminho `delay-worker → runtime-worker → SalesBot filho` concluído com pai e filho `completed`;
- bloco `message` sem canal real pausou em `retry_current`, preservando contexto e sem simular envio;
- token inválido do scheduler retorna `401`;
- bearer inválido do runtime retorna `401`;
- cron com execuções `succeeded`;
- `pg_net` movido de `public` para `extensions` e cron revalidado depois da migração;
- Security Advisor voltou a 0 lints após o hardening;
- RLS sem sessão: usuário `authenticated` vê 0 linhas e atualiza 0 linhas no storage F05;
- segredo/token do scheduler acessível apenas a `service_role`/postgres;
- endpoints legados `ai-provider-runtime` e `ai-credentials` neutralizados; caminhos canônicos permanecem `ai-model-invoke` e `ai-credential-vault`;
- fixtures temporários removidos;
- `salesbots`, `salesbot-executions`, `automations`, agentes e perfis permanecem sem dados operacionais fictícios.

### 🟢 Patch mínimo do worker F01 pronto

Branch auxiliar: `f05-f01-worker-integration`.

PR #3: `[F05→F01] Conectar automation-event-worker ao runtime server-side F05`.

Última conferência:

- base exatamente na F01 atual;
- 1 commit à frente;
- 0 commits atrás;
- 1 arquivo alterado;
- `mergeable=true`;
- nenhuma alteração em Auth, UI, CRM core ou Inbox core.

O patch:

- conecta `start_salesbot` ao `f05-runtime-worker`;
- conecta `invoke_ai` ao `f05-runtime-worker`;
- preserva idempotência de `automation_action_runs`;
- mantém `service_role` apenas server-side;
- mantém timeout e `redirect: manual`;
- corrige precedência dos metadados canônicos sobre `event.payload` no matcher e no webhook.

### 🟢 RBAC estrutural F05

- 8 permissões F05 existem no backend;
- grupo de sistema `Administrador` está ativo e possui as 8 permissões F05;
- default-deny permanece na F05;
- policies de storage exigem `view`/`manage` por módulo;
- sem sessão autenticada, leitura e update retornam zero linhas.

### 🟠 Integração F05 → F01

O worker oficial da F01 ainda não recebeu o PR #3 e, portanto, continua com `start_salesbot`/`invoke_ai` como `not_configured` no código implantado atual.

A F05 não fará merge forçado nem deploy por cima da frente proprietária. O patch de integração já está isolado e pronto para absorção.

### 🟠 QA autenticado

Conferência real em 17/09/2026:

- `auth.users = 0`;
- `user_profiles` ativos = 0;
- `admin-user` usa Auth oficial, mas exige chamador autenticado com `users.manage`;
- sem bypass e sem insert direto em `auth.users`.

### 🟠 Pendências externas/finais

- F01 absorver PR #3 para ligar o worker oficial;
- F01 absorver demais hardenings/componentes F05 conforme necessário;
- primeiro admin QA pelo fluxo oficial;
- E2E autenticado admin/viewer;
- build/typecheck consolidado;
- chamada real a provedor IA com chave real;
- WhatsApp real;
- Meta real.

---

# Pedidos entre frentes

- F05 → F01 — rotas/sidebar/cofre/runtime estrutural: **RESOLVIDO HISTORICAMENTE**.
- F05 → F01 — worker `start_salesbot`/`invoke_ai`: **PATCH PR #3 PRONTO E MERGEÁVEL; ABSORÇÃO PELA F01 PENDENTE**.
- F05 → F01 — demais hardenings/componentes atuais: **PENDENTE**.
- F05 → F01/Auth — usuários temporários QA: **PENDENTE DE CAMINHO OFICIAL COM ADMIN AUTENTICADO**.
- F05 ↔ F04 — contratos CRM/Inbox: **ESTRUTURA PRESENTE; E2E PENDENTE**.

---

# Critério de status

- 🔴 não iniciado/não executado;
- 🟠 parcial, dependente ou ainda sem E2E final;
- 🟢 implementado e validado no escopo declarado.
