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

## 6. Verificação com documentação oficial dos provedores

Confirmado em 16/09/2026:

- OpenAI: Responses API e autenticação Bearer; segredo deve permanecer no servidor;
- Anthropic: Messages API `/v1/messages`, `x-api-key` e `anthropic-version`;
- Google Gemini: API `v1beta/interactions` disponível com `x-goog-api-key`.

Os nomes dos modelos não são fixados pela Hárpia. O administrador informa o modelo no perfil, permitindo evolução sem alteração de código.

## 7. Não verificado ainda

Os itens abaixo dependem de outras frentes ou da integração final e não devem ser tratados como concluídos:

- build Vite do produto final com a Frente05 montada no shell;
- navegação visual integrada da Frente05 dentro do painel;
- autenticação/permissões reais para acesso às telas da Frente05;
- persistência real da chave no cofre/backend da Frente01;
- resolução real de `secretRef` no backend da Frente01;
- eventos e ações reais do CRM/Inbox da Frente04;
- chamada real a OpenAI/Anthropic/Gemini usando chave do cliente;
- WhatsApp real;
- Meta real.
