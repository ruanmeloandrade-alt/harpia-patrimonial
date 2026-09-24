# WhatsApp Connector Deployment

Este serviço precisa rodar continuamente em Node.js. Não deve ser executado como Supabase Edge Function.

## Requisitos

* Node 22 quando executado sem container.
* Docker recomendado.
* HTTPS público para a rota de controle, normalmente via reverse proxy.
* Reinício automático do processo.
* Relógio do servidor sincronizado.
* Variáveis de ambiente fora do Git.
* Banco Supabase já com as migrations F07 e F08 aplicadas.

## Variáveis do serviço

Copie `.env.example` para `.env` somente no servidor.

Obrigatórias:

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
* `WHATSAPP_CONNECTOR_TOKEN`
* `WHATSAPP_SESSION_ENCRYPTION_KEY`

A chave `WHATSAPP_SESSION_ENCRYPTION_KEY` deve ser Base64 de exatamente 32 bytes.

O token `WHATSAPP_CONNECTOR_TOKEN` deve ser longo, aleatório e igual ao secret configurado nas Edge Functions.

Nunca versionar `.env`, service role, token do conector, chave de criptografia, QR ou estado de sessão.

## Subida com Docker

No diretório deste serviço:

```sh
cp .env.example .env
docker compose -f docker-compose.example.yml build
docker compose -f docker-compose.example.yml up -d
```

O compose de exemplo publica o processo somente em `127.0.0.1:8080`. Use um reverse proxy HTTPS para expor o endpoint necessário ao Supabase.

## Reverse proxy

O endereço final usado em `WHATSAPP_CONNECTOR_URL` precisa:

* usar HTTPS;
* apontar para este processo;
* encaminhar `Authorization`;
* não armazenar ou exibir o header de autorização em logs;
* não cachear respostas;
* aceitar `GET /v1/status`, `GET /v1/qr` e `POST /v1/*`;
* manter `/health` disponível para monitoramento.

As rotas `/v1/*` exigem o Bearer token do conector.

## Edge Functions

Depois do serviço estar publicado, configurar no Supabase:

* `WHATSAPP_CONNECTOR_URL=https://host-do-conector`
* `WHATSAPP_CONNECTOR_TOKEN=<mesmo token do serviço>`

As Edge Functions já esperadas são:

* `whatsapp-connector-control`
* `whatsapp-transport`

O frontend não recebe essas credenciais.

## Verificação inicial

1. `GET /health` deve responder processo ativo.
2. A tela Integrações deve iniciar conexão.
3. O backend deve mudar para `connecting`.
4. O QR deve ser renderizado pela Edge Function.
5. Depois do pareamento, `integration_connections.status` deve ficar `connected`.
6. `last_health_at` deve avançar a cada heartbeat.
7. A conta deve aparecer em `inbox_channel_accounts`.
8. Reiniciar o container não deve apagar a sessão.
9. Logout real do WhatsApp deve resultar em `reauth_required`.

## Release

O serviço ainda precisa de um `package-lock.json` gerado por instalação limpa antes do release final reprodutível.

Não considerar F08 concluída até passar teste real de QR, recebimento, envio, mídia e reinício.
