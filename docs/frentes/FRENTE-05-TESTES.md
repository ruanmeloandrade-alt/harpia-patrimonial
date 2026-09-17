# Frente05 — validações e testes

Data: 17/09/2026
Branch: `frente-05`

Este documento registra somente verificações realmente executadas. Não substitui build/E2E autenticado do produto consolidado.

## 1. SalesBot — runtime e command port

Status: 🟢 OK em testes isolados.

Validado:

- `delay` pausa a execução;
- `resumeMode=next_block` retoma após o delay sem reagendar o mesmo bloco;
- dependência `not_configured` pausa com `retry_current`;
- retomada repete somente o bloco pendente;
- `start()` cria execução;
- `resume()` continua execução pausada;
- encadeamento usa o mesmo factory de command port;
- erros não são mascarados como sucesso.

## 2. Contexto de retomada, concorrência e encadeamento

Status: 🟢 estrutura implementada; testes isolados anteriores aprovados para contexto/encadeamento.

Validado anteriormente:

- contexto persiste durante pausa;
- recriação do command port não perde contexto;
- `resume()` preserva `leadId` e `conversationId` canônicos;
- conclusão remove `runtimeContext`;
- SalesBot A → B preserva contexto;
- `F05_CONTEXT_RESUME_TEST_OK`;
- `F05_CHAIN_CONTEXT_TEST_OK`.

Hardening de 17/09/2026:

- `resumeClaimToken`;
- `resumeClaimedUntil`;
- lease de retomada;
- escrita confirmada com optimistic locking antes de retomar;
- exclusão de execuções com lease ativo da lista de delays elegíveis;
- limpeza do lease ao iniciar, pausar, concluir ou falhar.

Teste concorrente multi-browser ainda depende de E2E autenticado.

## 3. Automatize

Status: 🟢 OK em teste isolado.

- evento + condição verdadeira executa ações em ordem;
- condição falsa não executa ações;
- `not_configured`/`rejected` interrompem sequência;
- referências de SalesBot/agente são validadas;
- metadados canônicos do evento não podem ser sobrescritos pelo payload;
- método de webhook é normalizado.

## 4. Integridade de referências

Status: 🟢 OK em testes controlados.

- SalesBot referenciado não pode ser excluído;
- agente IA referenciado não pode ser excluído;
- provedor usado por agente não pode ser excluído;
- recurso ativo não pode ser pausado/desativado quando recurso ativo depende dele;
- ciclos A→B→A em SalesBots são detectados;
- autoencadeamento é bloqueado.

## 5. Provedores e runtime IA

Status: 🟢 estrutural/isolado; 🟠 chamada real depende de credencial real.

Validado com respostas controladas:

- OpenAI/OpenAI-Codex;
- Anthropic/Claude;
- Google Gemini;
- customizado;
- resolução de `secretRef` somente no backend;
- logs de IA não persistem prompt/resposta;
- HTTPS obrigatório;
- CGNAT e redes privadas/reservadas bloqueados;
- redirect manual;
- timeout explícito.

## 6. Cofre Supabase/Vault

Status: 🟢 backend real validado.

Projeto: `desxomqvtjaymwwxivwq`.

Validado anteriormente:

- salvar segredo;
- resolver por `secretRef`;
- remover segredo;
- segredo de teste removido ao final;
- browser não recebe chave bruta;
- caminho canônico: `ai-credential-vault` + Supabase Vault.

## 7. Consistência perfil IA ↔ Vault

Status: 🟢 em testes controlados; 🟠 E2E autenticado ainda pendente.

Validado:

- primeira chave só fica configurada após persistência confirmada do perfil;
- falha de persistência aciona compensação no Vault;
- atualização preserva `secretRef` quando aplicável;
- remoção confirma perfil antes de apagar segredo;
- falha de remoção restaura perfil anterior;
- exclusão de perfil é revertida se limpeza do Vault falhar.

## 8. Storage compartilhado / multiusuário

Status: 🟢 em backend e testes controlados; 🟠 browser autenticado pendente.

Validado:

- coleções estruturais F05 sem dados operacionais fictícios;
- optimistic locking por revisão;
- rollback por geração;
- refresh remoto invalida rollback atrasado;
- escrita confirmada para mutações críticas;
- listeners de UI;
- RLS/default-deny;
- Security Advisor atual: 0 lints.

## 9. URLs externas / webhook

Status: 🟢 F05.

Validado/bloqueado:

- HTTPS obrigatório;
- localhost e hosts `.local`;
- IPv4 privada/link-local;
- CGNAT `100.64.0.0/10`;
- IPv6 local/privado literal;
- métodos fora do conjunto permitido;
- redirects externos;
- timeout explícito.

## 10. RBAC Frente01 ↔ Frente05

Status: 🟢 estruturalmente resolvido na F01; 🟠 E2E com usuários reais pendente.

Confirmado anteriormente:

- `salesbot.view OR salesbot.manage`;
- `automations.view OR automations.manage`;
- `ai.view OR ai.manage`;
- `integrations.view OR integrations.manage`;
- `canManage` explícito;
- default-deny na F05.

Backend real conferido em 17/09/2026:

- as 8 permissões F05 existem em `permissions`;
- grupo de sistema `Administrador` está ativo e contém as 8 permissões F05.

## 11. Integração CRM/Inbox

Status: 🟢 estrutural; 🟠 E2E real pendente.

Confirmado:

- CRM → Automatize;
- ações CRM usadas por SalesBot/Automatize;
- Inbox → command ports SalesBot/IA;
- condição e webhook ligados ao runtime interno;
- contexto de SalesBot sobrevive a pausa/recriação/retomada;
- canais não fingem conexão WhatsApp real.

## 12. Runtime server-side F05

Status: 🟢 implementado e implantado no Supabase; 🟠 consumo pelo worker F01 ainda pendente.

Edge Function:

- `f05-runtime-worker` — ACTIVE.

Fonte versionada:

- `supabase/functions/f05-runtime-worker/index.ts`;
- `supabase/functions/f05-runtime-worker/config.toml`.

Capacidades:

- `start_salesbot`;
- `invoke_ai`;
- leitura de estado compartilhado F05;
- persistência com revisão otimista;
- condições;
- delays;
- ações CRM;
- webhook;
- encadeamento;
- agente IA;
- quatro perfis de provedor;
- credencial resolvida somente server-side;
- SSRF hardening;
- `not_configured` para mensagem enquanto canal real não estiver conectado.

Validação executada:

- deploy aceito e função `ACTIVE`;
- Security Advisor: 0 lints;
- chamada com bearer inválido retornou `401` com `Não autorizado.`;
- caminho server-side de `start_salesbot` foi exercitado indiretamente pelo `f05-delay-worker` em teste de encadeamento e concluiu bot filho com sucesso.

## 13. Scheduler server-side durável de delays

Status: 🟢 IMPLEMENTADO E TESTADO NO BACKEND REAL.

Componentes ativos:

- Edge Function `f05-delay-worker` — ACTIVE;
- `pg_cron` ativo;
- `pg_net` ativo;
- cron `f05-delay-resume-30s` ativo, frequência de 30 segundos;
- token do scheduler armazenado no Supabase Vault;
- RPC `admin_validate_f05_scheduler_token` para autenticação do worker;
- RPC restrito a `service_role` e postgres;
- schema versionado em `supabase/schema/f05_durable_delay_scheduler.sql`;
- código versionado em `supabase/functions/f05-delay-worker/**`.

Teste funcional 1 — retomada simples:

1. coleções reais estavam vazias;
2. fixture temporário `trigger → delay → finish` foi criado;
3. execução `paused/next_block` com `resumeAt` vencido foi inserida;
4. worker foi disparado pelo mesmo caminho HTTP do cron;
5. execução avançou para `qa_finish` e terminou `completed`;
6. fixture removido imediatamente;
7. coleções voltaram a zero itens.

Teste funcional 2 — encadeamento server-side:

1. SalesBot pai temporário: `trigger → delay → chain_flow → finish`;
2. SalesBot filho temporário: `trigger → finish`;
3. pai retomado pelo `f05-delay-worker`;
4. `chain_flow` chamou `f05-runtime-worker`;
5. runtime criou execução do filho;
6. filho terminou `completed` no `qa_child_finish`;
7. pai terminou `completed` no `qa_parent_finish`;
8. fixtures removidos e coleções voltaram a zero itens.

Teste de autenticação:

- chamada ao scheduler com token inválido retornou HTTP `401` e `Token de scheduler inválido.`;
- chamada válida retornou HTTP `200` quando não havia delays pendentes.

Cron:

- execuções recentes em `cron.job_run_details` aparecem como `succeeded`.

## 14. Worker server-side de automações da F01

Status: 🟠 integração pendente na frente proprietária.

O `automation-event-worker` atual da F01 ainda executa:

- CRM: conectado;
- webhook: conectado;
- `start_salesbot`: `not_configured`;
- `invoke_ai`: `not_configured`.

A F05 já possui runtime server-side pronto e documentou contrato/pseudocódigo de integração em `FRENTE-05-INTEGRACAO-F01.md`.

## 15. Usuários temporários de QA

Status: 🟠 autorizados, ainda inexistentes.

Conferência real em 17/09/2026:

- `auth.users = 0`;
- `user_profiles` ativos = 0;
- `admin-user` existe e usa `auth.admin.createUser`, mas exige chamador já autenticado com `users.manage`;
- `f01-bootstrap-qa` está encerrado e retorna 410.

A F05 não fará insert direto em `auth.users` nem criará bypass de autenticação.

## 16. Build/typecheck

Status: 🟠 NÃO VERIFICADO no produto consolidado.

Não marcar como verde até execução em ambiente apropriado da branch integrada.

## 17. Ainda não verificado

Não marcar como verde final:

- build Vite/typecheck consolidado;
- navegação visual autenticada;
- E2E RBAC admin/viewer;
- persistência/concorrência via browser autenticado;
- cofre pela UI autenticada;
- chamada real a provedor IA com chave real;
- `automation-event-worker` F01 → `f05-runtime-worker`;
- WhatsApp real;
- Meta real.
