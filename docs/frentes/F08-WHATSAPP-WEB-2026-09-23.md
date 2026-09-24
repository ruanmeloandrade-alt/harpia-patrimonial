# HARP F08 WhatsApp Web

Data: 23/09/2026

Branch: `work/f08-whatsapp-web-20260923`

Base: `work/f07-integration-core-20260923`

Status geral: 🟠 PARCIAL / EM ANDAMENTO

## Objetivo

Conectar uma sessão real de WhatsApp Web à Inbox, CRM e SalesBot usando processo Node persistente, sem falso envio e sem expor sessão, QR, service role ou token do conector ao frontend.

## Estado por bloco

### 🟢 Fundação server-side

Implementado:

* tabela privada `private.whatsapp_auth_state`;
* sessão criptografada com AES-256-GCM;
* acesso ao estado de sessão somente por RPCs `service_role`;
* registro real em `integration_connections`;
* conta de canal em `inbox_channel_accounts`;
* eventos em `integration_events`;
* ingestão idempotente por `provider + external_message_id`;
* criação/resolução de lead por telefone;
* tratamento de LID antes de criar lead;
* preparação segura de conversa de saída a partir do CRM;
* Storage privado `inbox-media`;
* entrada e saída de imagem, áudio, vídeo MP4 e documentos suportados;
* watchdog de heartbeat com `pg_cron`;
* queda do heartbeat muda integração para `degraded` e conversas para erro.

### 🟢 Processo Node preparado

Serviço: `services/whatsapp-connector`.

Inclui:

* Baileys `7.0.0-rc14` pinado;
* Node 22;
* QR;
* reconexão com backoff;
* isolamento de eventos de socket antigo durante reconexão;
* heartbeat;
* logout para `reauth_required`;
* shutdown seguro sem apagar sessão;
* download e upload de mídia via Supabase Storage;
* sessão no banco, não em arquivo local;
* logger com redaction de token, QR, sessão e valor criptografado;
* API interna protegida por Bearer token;
* `/health`;
* `/v1/status`;
* `/v1/qr`;
* `/v1/connect`;
* `/v1/reconnect`;
* `/v1/disconnect`;
* `/v1/send`.

### 🟢 Edge Functions implantadas

* `whatsapp-connector-control`: ACTIVE v1, JWT obrigatório.
* `whatsapp-transport`: ACTIVE v3, JWT obrigatório.
* `f05-runtime-worker`: ACTIVE v4.

Regras:

* frontend não recebe `WHATSAPP_CONNECTOR_TOKEN`;
* QR bruto fica no backend e chega ao frontend como SVG;
* ações administrativas exigem `integrations.manage`;
* envio humano exige `inbox.manage`;
* worker server-side usa o mesmo `whatsapp-transport`;
* SalesBot do navegador também usa a mesma rota.

### 🟢 Inbox e SalesBot integrados estruturalmente

Inbox:

* botão `Ativar WhatsApp` só conecta conversa após confirmação do backend;
* backend exige heartbeat recente;
* lead precisa ter WhatsApp válido;
* envio de texto usa transporte real;
* composer aceita mídia privada;
* anexos são persistidos com bucket/path;
* leitura usa signed URL;
* falha de transporte não vira falso `sent`.

SalesBot:

* bloco `message` server-side usa `whatsapp-transport`;
* bloco `message` iniciado no navegador usa a mesma rota;
* transporte indisponível pausa como `not_configured`;
* falhas reais são rejeitadas.

### 🟢 Segurança e integridade estrutural

Validado em Supabase:

* Security Advisor: 0 lints;
* policy deny explícita em `private.whatsapp_auth_state`;
* Storage SELECT condicionado a `inbox.view/manage`;
* Storage INSERT/UPDATE/DELETE condicionado a `inbox.manage`;
* nenhum segredo foi adicionado ao repositório;
* `.env.example` contém apenas nomes de variáveis;
* migrations F07/F08 aplicadas no projeto real.

### 🟢 Smoke tests transacionais executados

Passaram com rollback:

* ingestão de mensagem recebida;
* deduplicação do mesmo external message id;
* criação de conversa;
* resolução/criação de lead;
* preparação CRM para conversa WhatsApp;
* leitura/escrita/exclusão de estado de sessão por RPC;
* watchdog de heartbeat stale.

Conferência final de resíduos:

* 0 conexões QA;
* 0 contas QA;
* 0 conversas QA;
* 0 mensagens QA;
* 0 estados de sessão QA.

### 🟢 Watchdog ativo

Cron:

* `f08-whatsapp-heartbeat-watchdog`;
* frequência: 1 minuto;
* heartbeat considerado stale após 120 segundos.

O cron F05 existente continua ativo e não foi substituído.

## Migrations F08 aplicadas

* `f08_whatsapp_connector_foundation`;
* `f08_whatsapp_auth_state_default_deny`;
* `f08_prepare_whatsapp_conversation`;
* `f08_whatsapp_auth_state_rpcs`;
* `f08_inbox_media_write`;
* `f08_whatsapp_heartbeat_watchdog`;
* `f08_inbox_media_mime_types`.

## Deploy preparado

Arquivos:

* `services/whatsapp-connector/Dockerfile`;
* `services/whatsapp-connector/docker-compose.example.yml`;
* `services/whatsapp-connector/.env.example`;
* `services/whatsapp-connector/.dockerignore`;
* `services/whatsapp-connector/DEPLOY.md`.

O serviço deve rodar em processo persistente com HTTPS.

## 🔴 Bloqueador externo para validação real

Ainda não existe um host persistente conectado nesta sessão de trabalho.

Para ativar produção faltam no ambiente de hospedagem:

* `SUPABASE_URL`;
* `SUPABASE_SERVICE_ROLE_KEY`;
* `WHATSAPP_CONNECTOR_TOKEN`;
* `WHATSAPP_SESSION_ENCRYPTION_KEY`;
* URL HTTPS pública do conector.

No Supabase Edge, ainda precisam ser configurados:

* `WHATSAPP_CONNECTOR_URL`;
* `WHATSAPP_CONNECTOR_TOKEN`.

Esses valores não devem entrar no GitHub.

## NÃO VERIFICADO

Por depender do host real e/ou checkout executável:

* `npm run typecheck` do app completo;
* `npm run build` do app completo;
* build do serviço Node;
* QR real em aparelho;
* pareamento real;
* recebimento real de texto;
* envio real de texto;
* recebimento real de mídia;
* envio real de mídia;
* reinício real do container recuperando sessão;
* logout real mudando para `reauth_required`;
* E2E navegador da tela Integrações e Inbox;
* duas sessões internas simultâneas.

Nenhum desses itens recebe status verde até ser executado.

## Dependências para fechamento

1. Subir `services/whatsapp-connector` em VPS/serviço persistente.
2. Configurar os secrets no host.
3. Configurar URL/token nas Edge Functions.
4. Rodar QR real.
5. Executar E2E de entrada, saída, mídia, restart e logout.
6. Gerar `package-lock.json` por instalação limpa.
7. Rodar typecheck/build.
8. Só depois avaliar merge F08.

## Rollback

* `main` permanece intacta.
* F08 está isolada nesta branch.
* Sessão e tabelas são aditivas.
* Edge Functions podem permanecer sem URL/token do conector e responderão indisponível, sem falso sucesso.
* O estado legado da Inbox não foi apagado.
* F07 permanece como base de rollback da F08.

## Semáforo

* 🟢 Banco, RLS, dedupe e health estrutural.
* 🟢 Edge proxy de controle e transporte.
* 🟢 Integração estrutural Inbox e SalesBot.
* 🟢 Mídia privada estrutural.
* 🟢 Watchdog e smoke tests de banco.
* 🟠 Serviço Node pronto para deploy, ainda não executado em host persistente.
* 🔴 QR e tráfego real ainda não testados.
* 🟠 Build/typecheck ainda não executados.
