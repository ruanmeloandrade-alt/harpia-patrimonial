# Frente05 — validações e testes isolados

Data: 16/09/2026
Branch: `frente-05`

Este documento registra somente verificações realmente executadas para a Frente05. Não substitui o build integrado da plataforma.

## 1. SalesBot — runtime

Status: OK

Cenários executados em ambiente isolado com dependências controladas:

- fluxo com `delay` pausa após o agendamento;
- `resumeMode=next_block` retoma no bloco posterior ao `delay`;
- o mesmo `delay` não é agendado duas vezes na retomada;
- ação externa `not_configured` pausa com `resumeMode=retry_current`;
- após disponibilizar a dependência, a retomada repete somente o bloco pendente e conclui;
- TypeScript do núcleo usado no teste: OK.

## 2. SalesBot — command port

Status: OK

Cenários executados:

- `start()` cria execução e efetivamente chama o runtime;
- fluxo em espera retorna `accepted` com estado de runtime `paused`;
- `resume()` continua a execução e conclui;
- dependência ausente retorna `not_configured` sem fingir sucesso;
- após disponibilizar a dependência, `resume()` conclui;
- command port de encadeamento é resolvido internamente pelo factory `createSalesBotCommandPort`.

## 3. Automatize — motor de eventos

Status: OK

Cenários executados:

- evento correto + condição verdadeira executa ações em ordem;
- evento com condição falsa não executa ações;
- evento sem dependência disponível retorna estado real;
- sequência interrompe quando uma ação retorna `not_configured` ou `rejected`, evitando executar etapas seguintes em estado inconsistente;
- TypeScript do motor usado no teste: OK.

## 4. Provedores de IA — adaptadores HTTP

Status: OK em testes isolados de construção/extração. Chamada real com chave de cliente: NÃO EXECUTADA.

Verificações executadas:

- OpenAI e OpenAI/Codex: autenticação Bearer, payload de Responses API e normalização de base URL;
- Anthropic/Claude: `x-api-key`, `anthropic-version`, Messages API e normalização de base URL;
- Google Gemini: `x-goog-api-key`, Interactions API e normalização de base URL;
- provedor customizado: endpoint definido pelo administrador;
- extração de texto testada com respostas controladas para os quatro tipos de provedor;
- TypeScript do adaptador usado no teste: OK.

## 5. Agente IA — cofre -> runtime -> agente -> log

Status: OK em teste isolado.

Cenários executados:

- `secretRef` é entregue ao resolvedor server-side;
- chave bruta é resolvida somente no runtime de backend;
- chave é usada na chamada controlada do provedor e não é persistida no browser;
- resultado volta pelo `AIAgentCommandPort`;
- execução termina como `completed` quando o runtime conclui;
- `not_configured` é propagado sem sucesso fictício;
- log de IA registra metadados operacionais, mas não persiste prompt nem resposta;
- TypeScript do conjunto usado no teste: OK.

## 6. Cofre real Supabase / Vault

Status: OK no backend real da Hárpia.

Projeto utilizado: Supabase `Harpia Patrimonial`, ref `desxomqvtjaymwwxivwq`.

Verificações realmente executadas:

- migration `f05_ai_credentials_vault` aplicada;
- schema privado `private_f05` criado;
- credenciais relacionadas ao perfil ficam mapeadas em `private_f05.ai_provider_credentials`;
- segredo bruto é armazenado no Supabase Vault e não na tabela de configuração;
- RPCs de salvar, remover e resolver segredo são restritas a `service_role`;
- round-trip real executado: salvar segredo de teste -> resolver pelo `secretRef` -> comparar valor -> remover;
- após o teste, consulta confirmou 0 registros residuais do perfil de teste;
- migration defensiva `f05_ai_credentials_rls_deny` aplicada;
- Supabase Security Advisor após as migrations: 0 lints.

## 7. Edge Function de credenciais

Status: PUBLICADA / BACKEND ATIVO. E2E com usuário administrador real: PENDENTE.

- função `ai-credentials` publicada no projeto real;
- status `ACTIVE`;
- `verify_jwt = true`;
- exige usuário autenticado;
- exige permissão `integrations.manage` consultada em `current_user_permissions`;
- somente depois da autorização usa `service_role` para chamar os RPCs privados;
- resposta ao navegador contém apenas `secretRef`, nunca a chave bruta;
- função de remoção elimina o segredo no Vault.

O teste E2E pela tela ainda depende da criação/promoção do primeiro administrador real pela Frente01.

## 8. RBAC Frente01 -> Frente05

Status: ESTRUTURA DA F05 IMPLEMENTADA. TESTE INTEGRADO NO SHELL: PENDENTE.

A Frente05 passou a consumir as permissões já definidas pela Frente01:

- `salesbot.view` / `salesbot.manage`;
- `automations.view` / `automations.manage`;
- `ai.view` / `ai.manage`;
- `integrations.view` / `integrations.manage`.

A F05 oculta módulos sem `view` e oferece modo leitura quando existe `view` sem `manage`. O teste final depende da montagem do workspace no `AppRouter`/`InternalShell` da Frente01.

## 9. Verificação com documentação oficial dos provedores

Confirmado em 16/09/2026:

- OpenAI: Responses API e autenticação Bearer; segredo deve permanecer no servidor;
- Anthropic: Messages API `/v1/messages`, `x-api-key` e `anthropic-version`;
- Google Gemini: API `v1beta/interactions` disponível com `x-goog-api-key`.

Os nomes dos modelos não são fixados pela Hárpia. O administrador informa o modelo no perfil, permitindo evolução sem alteração de código.

## 10. Não verificado ainda

Os itens abaixo dependem de outras frentes ou da integração final e não devem ser tratados como concluídos:

- build Vite do produto final com a Frente05 montada no shell;
- navegação visual integrada da Frente05 dentro do painel;
- E2E de permissões Frente01 -> Frente05 com usuário interno real;
- E2E pela tela para salvar/remover uma API key real usando `ai-credentials`;
- resolução real de `secretRef` durante uma chamada de modelo executada pela aplicação integrada;
- eventos e ações reais do CRM/Inbox da Frente04;
- chamada real a OpenAI/Anthropic/Gemini usando chave do cliente;
- WhatsApp real;
- Meta real.
