# Frente05 — validações e testes

Data: 16/09/2026
Branch: `frente-05`

Este documento registra somente verificações realmente executadas para a Frente05. Não substitui o build/E2E integrado da plataforma.

## 1. SalesBot — runtime

Status: OK em teste isolado.

Cenários executados em ambiente isolado com dependências controladas:

- fluxo com `delay` pausa após o agendamento;
- `resumeMode=next_block` retoma no bloco posterior ao `delay`;
- o mesmo `delay` não é agendado duas vezes na retomada;
- ação externa `not_configured` pausa com `resumeMode=retry_current`;
- após disponibilizar a dependência, a retomada repete somente o bloco pendente e conclui;
- TypeScript do núcleo usado no teste: OK.

## 2. SalesBot — command port

Status: OK em teste isolado.

- `start()` cria execução e chama o runtime;
- fluxo em espera retorna `accepted` com estado `paused`;
- `resume()` continua a execução;
- dependência ausente retorna `not_configured` sem fingir sucesso;
- após disponibilizar a dependência, `resume()` conclui;
- encadeamento usa o factory `createSalesBotCommandPort`.

## 3. Automatize — motor de eventos

Status: OK em teste isolado.

- evento correto + condição verdadeira executa ações em ordem;
- condição falsa não executa ações;
- dependência ausente retorna estado real;
- sequência para em `not_configured` ou `rejected`, evitando estado parcial.

## 4. Provedores de IA — adaptadores

Status: OK em testes isolados. Chamada real com chave de cliente: NÃO EXECUTADA.

- OpenAI/OpenAI-Codex: Bearer + Responses API;
- Anthropic/Claude: `x-api-key` + `anthropic-version` + Messages API;
- Google Gemini: `x-goog-api-key` + Interactions API;
- customizado: endpoint configurável;
- extração de texto testada com respostas controladas.

## 5. Agente IA — runtime isolado

Status: OK em teste isolado.

- `secretRef` chega ao resolvedor server-side;
- chave bruta só é resolvida no backend;
- resultado retorna pelo `AIAgentCommandPort`;
- execução conclui como `completed` quando o runtime conclui;
- `not_configured` é propagado;
- log não persiste prompt nem resposta.

## 6. Cofre real Supabase / Vault

Status: OK no backend real da Hárpia.

Projeto: Supabase `Harpia Patrimonial`, ref `desxomqvtjaymwwxivwq`.

Verificações executadas durante a implementação:

- armazenamento de segredo em Supabase Vault;
- round-trip real salvar -> resolver por `secretRef` -> remover;
- segredo de teste removido ao final;
- caminho canônico atual consolidado pela Frente01: Edge Function `ai-credential-vault` + `private.ai_credential_refs` + RPCs `admin_store_ai_credential`, `admin_delete_ai_credential`, `admin_resolve_ai_credential`;
- o browser não recebe a chave bruta.

A função anterior `ai-credentials` existiu durante a integração, mas não é mais o caminho canônico da aplicação.

## 7. Runtime IA server-side integrado

Status: ESTRUTURA ATIVA. CHAMADA REAL A PROVEDOR: PENDENTE.

Confirmado na composição da Frente01:

- Edge Function canônica `ai-model-invoke`;
- adapter seguro `SupabaseAIModelRuntime`;
- `createAIAgentCommandPort` usa esse runtime;
- SalesBot usa o mesmo command port de IA;
- perfil e credencial são resolvidos no backend;
- executor suporta OpenAI/Codex, Anthropic/Claude, Gemini e customizado;
- endpoint customizado exige HTTPS e bloqueia hosts locais/privados conhecidos.

Não foi executada chamada real porque não há API key real cadastrada.

## 8. Estado compartilhado F05 / Supabase

Status: BACKEND REAL VALIDADO SEM CRIAR DADO FICTÍCIO.

Verificações executadas em 16/09/2026:

- `public.f05_shared_storage` contém exatamente as sete chaves estruturais esperadas;
- SalesBots = 0 itens / revisão 0;
- execuções SalesBot = 0 itens / revisão 0;
- Automatize = 0 itens / revisão 0;
- agentes IA = 0 itens / revisão 0;
- execuções IA = 0 itens / revisão 0;
- perfis de provedor = 0 itens / revisão 0;
- integrações = 0 itens / revisão 0;
- `anon` não possui SELECT na tabela e a consulta como role `anon` foi recusada;
- role `authenticated` sem identidade/JWT válida visualizou 0 linhas por RLS;
- `anon` não possui EXECUTE em `save_f05_shared_storage`;
- `authenticated` possui EXECUTE no RPC, sujeito às policies/permissões;
- desenho final: `SECURITY INVOKER` + policy RLS `f05_shared_storage_update`;
- Security Advisor após a convergência: 0 lints.

## 9. Sincronização de UI / falha de persistência

Status: IMPLEMENTADA E TESTADA EM CORRIDA CONTROLADA; E2E BROWSER/SUPABASE AINDA PENDENTE.

Implementado nesta rodada:

- hidratação compartilhada dispara atualização dos workspaces;
- confirmação de escrita dispara atualização da UI;
- erro de persistência dispara rollback em memória;
- rollback só ocorre se a escrita rejeitada ainda for a geração mais recente daquela chave;
- `replaceStoredListFromRemote(...)` restaura snapshot autoritativo vindo do backend e invalida rollbacks antigos;
- SalesBot, Automatize, Agentes IA, Provedores/Integrações e Execuções escutam eventos de storage compartilhado;
- contrato alinhado ao adapter `sharedF05Storage` da Frente01.

Teste controlado realmente executado:

- duas escritas locais consecutivas + refresh remoto autoritativo + duas rejeições atrasadas => snapshot remoto permaneceu intacto;
- uma escrita isolada rejeitada => rollback voltou ao valor anterior;
- resultado: `F05 storage race/rollback tests: OK`.

Ainda falta validar esse comportamento dentro do browser autenticado do produto consolidado.

## 10. RBAC Frente01 ↔ Frente05

Status: NÚCLEO F05 ENDURECIDO; DESVIO AINDA EXISTE NO INTEGRADOR F01.

A F05 suporta:

- `salesbot.view` / `salesbot.manage`;
- `automations.view` / `automations.manage`;
- `ai.view` / `ai.manage`;
- `integrations.view` / `integrations.manage`;
- modo leitura quando existe `view` sem `manage`.

Hardening aplicado na branch F05:

- `Front05Workspace` usa `NO_FRONT05_ACCESS` quando `access` não é informado;
- SalesBot, Automatize, Agentes IA, Integrações, Provedores IA e Execuções usam `canManage=false` por padrão;
- `FULL_FRONT05_ACCESS` continua disponível apenas para uso explícito em harness standalone/QA;
- omissão de props de autorização nunca concede edição por acidente.

QA da branch `frente-01` encontrou:

- SalesBot/Automatize/Agentes/Integrações ainda estão protegidos por `*.manage` na rota, portanto `*.view` sozinho não abre a tela;
- workspaces integrados são montados sem `canManage` explícito;
- após sincronizar o novo default-deny da F05, a F01 precisa passar `canManage={auth.hasPermission(...manage)}` para que administradores editem e viewers permaneçam somente leitura.

Correção necessária na F01 está documentada em `docs/frentes/FRENTE-05-INTEGRACAO-F01.md`.

## 11. Integração CRM / Inbox / Automatize

Status: ESTRUTURALMENTE CONECTADA NA FRENTE01; E2E COM RECURSO REAL PENDENTE.

Confirmado na composição atual da Frente01:

- `Front05CrmEventSink` recebe eventos do `CrmService`;
- Automatize recebe ações CRM;
- SalesBot recebe ações CRM;
- SalesBot recebe avaliador de condição;
- SalesBot e Automatize recebem executor de webhook;
- Inbox usa adapter F04↔F05;
- seleção de SalesBot/agente continua explícita por conversa;
- canal de mensagem real permanece não conectado, sem envio fictício.

## 12. Usuários temporários de QA

Status: AUTORIZADOS PELO RESPONSÁVEL DO PROJETO; CRIAÇÃO BLOQUEADA PELA FERRAMENTA DESTA SESSÃO.

Autorização recebida em 16/09/2026 para criar:

- um administrador interno temporário de QA;
- um usuário interno temporário com permissões restritas para testar `view` sem `manage`;
- ambos devem ser excluídos ao término dos testes.

Limitação desta sessão:

- o conector Supabase bloqueou operações que criam credenciais/Auth;
- o runtime local não possui resolução de rede para chamar o endpoint público do Supabase Auth;
- não foi feito bypass por insert direto em `auth.users`.

Estado real conferido após a tentativa: `auth.users = 0`; nenhum usuário de QA foi criado.

## 13. Não verificado ainda

Não tratar como concluído:

- build Vite/typecheck do produto consolidado;
- navegação visual/E2E autenticado dos módulos F05;
- RBAC `view/manage` corrigido no integrador F01 e validado com usuários reais;
- persistência/rollback testados pelo browser autenticado;
- salvar/remover API key real pela tela;
- chamada real OpenAI/Anthropic/Gemini com credencial do cliente;
- execução ponta a ponta Inbox/CRM → SalesBot/IA com recurso real configurado;
- `delay` com agendador durável de produção;
- envio de mensagem por WhatsApp;
- Meta real.
