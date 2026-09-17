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

Edge Function implantada em 17/09/2026:

- `f05-runtime-worker` — ACTIVE, versão 1.

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

Validação:

- deploy aceito pelo Supabase e função `ACTIVE`;
- Security Advisor: 0 lints.

## 13. Scheduler server-side durável de delays

Status: 🟢 IMPLEMENTADO E TESTADO NO BACKEND REAL.

Componentes ativos:

- Edge Function `f05-delay-worker` — ACTIVE;
- `pg_cron` ativo;
- `pg_net` ativo;
- cron `f05-delay-resume-30s` ativo, frequência de 30 segundos;
- token do scheduler armazenado no Supabase Vault;
- RPC `admin_validate_f05_scheduler_token` para autenticação do worker;
- schema versionado em `supabase/schema/f05_durable_delay_scheduler.sql`;
- código versionado em `supabase/functions/f05-delay-worker/**`.

Teste funcional executado em 17/09/2026:

1. coleções reais estavam vazias antes do teste;
2. foi criado um fixture temporário isolado com SalesBot `trigger → delay → finish` e uma execução `paused/next_block` já vencida;
3. o `f05-delay-worker` foi disparado pelo mesmo caminho HTTP usado pelo cron;
4. a execução avançou de `paused` para `completed`;
5. `currentBlockId` terminou em `qa_finish`;
6. `action` terminou em `Execução concluída após delay.`;
7. o fixture foi removido imediatamente;
8. após limpeza, `salesbots=0` e `salesbot-executions=0` novamente.

Também conferido:

- execuções recentes do job em `cron.job_run_details` com status `succeeded`;
- lease/claim impede retomada concorrente enquanto ativo;
- o worker continua a partir do bloco posterior ao `delay`, sem reiniciar o SalesBot;
- novo `delay` encontrado após retomada agenda novo `resumeAt` e pausa novamente.

## 14. Worker server-side de automações da F01

Status: 🟠 integração pendente na frente proprietária.

O `automation-event-worker` atual da F01 ainda executa:

- CRM: conectado;
- webhook: conectado;
- `start_salesbot`: `not_configured`;
- `invoke_ai`: `not_configured`.

A F05 já possui runtime server-side pronto para receber essas duas ações. Falta somente o encaminhamento no worker proprietário da F01.

## 15. Usuários temporários de QA

Status: 🟠 autorizados, ainda inexistentes.

Conferência real em 17/09/2026:

- `auth.users = 0`;
- `user_profiles` ativos = 0;
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
