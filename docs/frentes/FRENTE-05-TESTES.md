# Frente05 — validações e testes

Data: 16/09/2026
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

## 2. Contexto de retomada e encadeamento

Status: 🟢 OK em harness isolado executado em 16/09/2026.

Código testado: `runtimePorts.ts`, contrato atual de `runtime.ts` e repositório de execuções com dependências controladas.

Cenário 1 — pausa/recriação/retomada:

- `start()` recebeu contexto inicial;
- contexto foi persistido junto da execução pausada;
- command port foi recriado;
- `resume()` recuperou contexto anterior;
- contexto novo sobrescreveu somente chaves novas/alteradas;
- `leadId` e `conversationId` permaneceram canônicos;
- bloco posterior ao delay recebeu o contexto mesclado;
- ao concluir, `runtimeContext` foi removido do log.

Resultado: `F05_CONTEXT_RESUME_TEST_OK`.

Cenário 2 — SalesBot A → SalesBot B:

- A chamou B por `chain_flow`;
- B recebeu o mesmo payload operacional;
- `leadId` e `conversationId` foram preservados.

Resultado: `F05_CHAIN_CONTEXT_TEST_OK`.

## 3. Automatize

Status: 🟢 OK em teste isolado.

- evento + condição verdadeira executa ações em ordem;
- condição falsa não executa ações;
- `not_configured`/`rejected` interrompem sequência para evitar estado parcial;
- referências de SalesBot/agente são validadas.

## 4. Integridade de referências

Status: 🟢 OK em testes controlados.

- SalesBot referenciado não pode ser excluído;
- agente IA referenciado não pode ser excluído;
- provedor usado por agente não pode ser excluído;
- recurso ativo não pode ser pausado/desativado quando recurso ativo depende dele;
- ciclos A→B→A em SalesBots são detectados;
- autoencadeamento é bloqueado.

Resultado registrado anteriormente: `F05 reference-integrity/cycle tests: OK`.

## 5. Provedores e runtime IA

Status: 🟢 estrutural/isolado; 🟠 chamada real depende de credencial real.

Validado com respostas controladas:

- OpenAI/OpenAI-Codex;
- Anthropic/Claude;
- Google Gemini;
- customizado;
- resolução de `secretRef` somente no backend;
- logs de IA não persistem prompt/resposta.

Runtime integrado da F01 usa `ai-model-invoke`.

## 6. Cofre Supabase/Vault

Status: 🟢 backend real validado.

Projeto: `desxomqvtjaymwwxivwq`.

Validado:

- salvar segredo;
- resolver por `secretRef`;
- remover segredo;
- segredo de teste removido ao final;
- browser não recebe chave bruta;
- caminho canônico atual: `ai-credential-vault` + `private.ai_credential_refs` + Supabase Vault.

## 7. Consistência perfil IA ↔ Vault

Status: 🟢 em testes controlados; 🟠 E2E autenticado ainda pendente.

Validado:

- primeira chave só fica configurada após persistência confirmada do perfil;
- falha de persistência aciona compensação no Vault;
- atualização de chave preserva `secretRef` existente quando aplicável;
- remoção confirma perfil antes de apagar segredo;
- falha de remoção restaura perfil anterior;
- exclusão de perfil é revertida se limpeza do Vault falhar.

Resultado: `F05 credential/profile consistency tests: OK`.

## 8. Storage compartilhado / multiusuário

Status: 🟢 em backend e testes controlados; 🟠 browser autenticado pendente.

Validado:

- sete coleções estruturais F05 existem sem dados operacionais fictícios;
- optimistic locking por revisão;
- rollback por geração;
- refresh remoto invalida rollback atrasado;
- `writeStoredListConfirmed(...)` confirma/rejeita mutações críticas;
- listeners atualizam SalesBot, Automatize, Agentes, Integrações e Execuções;
- RLS/default-deny verificados;
- Security Advisor já foi validado com 0 lints após hardening.

Resultados:

- `F05 storage race/rollback tests: OK`;
- `F05 confirmed-write tests: OK`.

## 9. URLs externas / webhook

Status: 🟢 F05; 🟢 hardening correspondente no worker F01.

Validado/bloqueado:

- HTTPS obrigatório;
- localhost e hosts `.local`;
- IPv4 privada/link-local;
- CGNAT `100.64.0.0/10`;
- IPv6 local/privado literal;
- métodos fora do conjunto permitido;
- worker server-side recusa redirects externos.

Resultado anterior: `F05 outbound URL validation tests: OK`.

## 10. RBAC Frente01 ↔ Frente05

Status: 🟢 estruturalmente RESOLVIDO na F01; 🟠 E2E com usuários reais pendente.

Confirmado na branch F01:

- rotas SalesBot aceitam `salesbot.view OR salesbot.manage`;
- Automatize aceita `automations.view OR automations.manage`;
- Agentes IA aceita `ai.view OR ai.manage`;
- Integrações aceita `integrations.view OR integrations.manage`;
- `canManage` é passado explicitamente;
- F05 continua default-deny quando acesso não é informado.

## 11. Integração CRM/Inbox

Status: 🟢 estrutural; 🟠 E2E real pendente.

Confirmado:

- CRM → Automatize;
- ações CRM usadas por SalesBot/Automatize;
- Inbox → command ports SalesBot/IA;
- condição e webhook ligados ao runtime interno;
- contexto de SalesBot agora sobrevive a pausa/recriação/retomada;
- canais de mensagem não fingem conexão real.

## 12. Worker server-side de automações

Status: 🟠 parcial.

O worker atual da F01 executa:

- CRM: conectado;
- webhook: conectado;
- `start_salesbot`: `not_configured`;
- `invoke_ai`: `not_configured`.

Consequência: automação originada no outbox server-side ainda não é ponta a ponta para SalesBot/IA. O runtime interno/browser já possui esses dois recursos conectados.

## 13. Usuários temporários de QA

Status: 🟠 autorizados, ainda inexistentes.

Autorizado criar:

- 1 admin interno temporário;
- 1 viewer interno temporário com `*.view` sem `*.manage`;
- excluir ambos após QA.

Última conferência real nesta rodada:

- `auth.users = 0`;
- usuários internos ativos = 0.

A sessão F05 não possui caminho seguro para criar Auth e não fez bypass direto em `auth.users`.

## 14. Ainda não verificado

Não marcar como verde final:

- build Vite/typecheck consolidado;
- navegação visual autenticada;
- E2E RBAC admin/viewer;
- persistência/concorrência via browser autenticado;
- cofre pela UI autenticada;
- chamada real a provedor IA com chave real;
- outbox server-side → SalesBot/IA;
- agendador durável de produção para `delay`;
- WhatsApp real;
- Meta real.
