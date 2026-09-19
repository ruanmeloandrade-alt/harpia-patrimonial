# Hárpia Patrimonial — Escopo Fase 2: Integrações Reais + Organização da Operação

Data: 19/09/2026  
Base: `main` consolidada  
Auditoria de referência: `docs/AUDITORIA-FASE-2-2026-09-19.md`

## 1. Objetivo

Transformar a base consolidada da Hárpia em uma operação utilizável no dia a dia, com:

- navegação interna organizada;
- botões e ações com hierarquia consistente;
- persistência adequada para mensagens e concorrência;
- WhatsApp Web real conectado à Inbox;
- Meta Lead Ads real conectado ao CRM;
- status/saúde de integrações confiável;
- logs e recuperação de falhas;
- QA de navegador e publicação final.

A fase deve reutilizar os contratos existentes. É proibido criar uma segunda Inbox, um segundo CRM ou uma integração paralela que contorne SalesBot/Automatize.

## 2. Regras obrigatórias desta fase

1. GitHub continua fonte de verdade.
2. Supabase operacional continua fonte de verdade de dados.
3. Não usar GitHub Actions.
4. Não colocar token, sessão, cookie ou segredo no repositório.
5. Não marcar integração como conectada sem health real.
6. Não marcar mensagem como enviada antes da confirmação do transporte.
7. Não criar dados fictícios para “preencher” o sistema.
8. Não criar bots/agentes operacionais sem briefing real.
9. Toda entrada externa deve ser idempotente.
10. Webhooks devem ser autenticados/verificados.
11. Toda integração deve possuir logs, último sucesso, último erro e caminho de reconexão.
12. Toda mudança de persistência deve preservar os contratos consumidos pelos módulos existentes.
13. Alterações destrutivas precisam de confirmação e rollback/migração segura.
14. WhatsApp Web deve rodar em processo persistente; não usar Edge Function como processo de sessão.
15. Meta deve entrar por backend/Edge Function; token nunca vai para o frontend.
16. Build/typecheck/E2E não podem ser declarados aprovados sem execução real.

## 3. Divisão em cinco frentes novas

As antigas `frente-01` a `frente-05` permanecem históricas. Esta fase usa novas chaves para não confundir com a produção anterior.

---

# F06 — UX Operacional, Navegação e Sistema de Ações

**Chave:** `HARP-F06-UX-OPERACAO`  
**Objetivo:** eliminar a sensação de módulos/botões soltos e transformar a área interna em uma operação coerente.

## Entregas

### Navegação agrupada

Nova hierarquia proposta:

**Operação**
- Visão geral
- CRM
- Inbox
- Catálogo

**Automação**
- SalesBot
- Automatize
- Agentes IA
- Execuções

**Gestão**
- Usuários
- Funções e permissões

**Sistema**
- Integrações
- Configurações

A sidebar deve:
- suportar grupos recolhíveis no desktop;
- manter navegação compacta no tablet/mobile;
- destacar módulo e subárea atual;
- respeitar permissões sem deixar grupos vazios;
- evitar 12 botões visualmente equivalentes.

### Sistema único de ações

Criar componentes compartilhados:

- `PageHeader`;
- `PageActions`;
- `Button` com variantes;
- `IconButton`;
- `StatusBadge`;
- `Tabs`;
- `OverflowMenu`;
- `ConfirmDialog`;
- `EmptyState`;
- `InlineNotice`.

Regras:
- uma ação primária por contexto;
- ações secundárias agrupadas;
- ações destrutivas no menu contextual ou área específica;
- não espalhar botões de criação/edição sem relação visual;
- não duplicar estilos do CRM/F05/Inbox quando componente compartilhado resolver.

### Revisão por módulo

**CRM**
- separar seleção de funil das ações administrativas;
- mover “criar funil/etapa” para área de configuração ou ação contextual;
- ficha do lead continua em drawer;
- agrupar tags/campos/tarefas em seções/tabs.

**Inbox**
- preservar três colunas no desktop;
- toolbar de conversa no topo;
- composer somente com ações de mensagem;
- CRM/Automação no painel direito por tabs/seções;
- esconder controles impossíveis quando canal está desconectado;
- conexão do canal aparece como status, não como botão perdido.

**SalesBot / Automatize / IA**
- compartilhar shell visual;
- concentrar “criar”, “duplicar”, “ativar/pausar”, “excluir” em toolbar consistente;
- execuções deixam de parecer módulo desconectado e passam a ser acessíveis também a partir dos recursos que as geraram.

**Integrações**
- cards operacionais com status real;
- ação primária “Conectar”, “Reconectar” ou “Gerenciar”;
- detalhes técnicos em drawer/modal, não como coleção de botões de status manual.

## Critérios de aceite F06

- nenhuma tela principal com ações primárias espalhadas sem agrupamento;
- sidebar com quatro grupos;
- visual consistente entre CRM/Inbox/F05;
- navegação mobile funcional;
- zero botão morto;
- permissões preservadas;
- keyboard/focus básico;
- screenshots desktop/mobile revisados.

---

# F07 — Núcleo de Integrações + Persistência Operacional

**Chave:** `HARP-F07-INTEGRATION-CORE`  
**Objetivo:** criar a infraestrutura comum que WhatsApp e Meta usarão e retirar a Inbox do gargalo de JSONB único antes do tráfego real.

## 7.1. Normalização prioritária

Criar tabelas próprias para:

### Inbox
- `inbox_conversations`;
- `inbox_messages`;
- `inbox_message_attachments`;
- `inbox_channel_accounts` ou equivalente.

Campos mínimos de conversa:
- id;
- lead_id;
- channel;
- provider;
- external_thread_id;
- transport_status;
- last_message_at;
- timestamps.

Campos mínimos de mensagem:
- id;
- conversation_id;
- direction;
- type;
- text;
- delivery_status;
- external_message_id;
- provider_timestamp;
- error_code/error_message quando aplicável;
- timestamps.

Índices:
- conversation_id + created_at;
- external_message_id único por provider;
- external_thread_id/provider;
- lead_id;
- last_message_at.

### CRM — migração incremental

Normalizar primeiro as entidades de alto uso:
- leads;
- lead_history;
- tasks;
- tags / lead_tags;
- pipelines/stages conforme necessidade de concorrência.

Manter adapter compatível para que `CrmService` e consumidores existentes não precisem ser reescritos de uma vez.

### Migração

- snapshot do estado JSONB;
- migration incremental;
- rotina de import do estado existente;
- conferência de contagens;
- fallback/rollback;
- só depois desligar escrita no documento antigo.

## 7.2. Registro de integrações real

Criar persistência server-side para conexões:

- provider;
- connection status;
- account identifiers não secretos;
- connected_at;
- last_health_at;
- last_event_at;
- last_error_at;
- last_error_code;
- metadata segura;
- version/revision.

Status padronizado:
- `not_connected`;
- `connecting`;
- `connected`;
- `degraded`;
- `reauth_required`;
- `error`.

O frontend lê status. Não grava `connected` manualmente.

## 7.3. Segredos e sessões

- segredos somente server-side;
- Meta App Secret/token em mecanismo seguro;
- sessão WhatsApp criptografada e nunca commitada;
- separar metadado público de credencial;
- rotação/revogação sem quebrar a UI;
- não logar segredo/token/QR raw.

## 7.4. Observabilidade

Tabela/eventos de integração:
- provider;
- event type;
- external id;
- success/failure;
- attempt;
- latency;
- error code;
- timestamp.

Tela deve mostrar:
- estado atual;
- última conexão;
- último evento;
- último erro;
- botão de reconexão apropriado;
- link para log filtrado.

## Critérios de aceite F07

- Inbox não depende de regravar array completo a cada mensagem;
- deduplicação server-side;
- RLS/grants revisados;
- Realtime funcional nas novas tabelas quando necessário;
- adapters existentes continuam funcionando;
- integration status deriva de backend;
- Security Advisor sem novo problema relevante;
- migração comprovada em ambiente real sem perda.

---

# F08 — WhatsApp Web Real na Inbox

**Chave:** `HARP-F08-WHATSAPP-WEB`  
**Objetivo:** conectar uma sessão real de WhatsApp Web à Inbox, CRM e automações.

## Arquitetura

Criar um serviço Node persistente separado da Edge Function:

`WhatsApp Web <-> Connector Service <-> Supabase/API <-> InboxTransportPort <-> Inbox/CRM/F05`

O processo deve suportar:
- sessão longa;
- WebSocket;
- QR/pairing;
- reconexão;
- heartbeat;
- shutdown/restart seguro.

O adapter concreto deve implementar o contrato existente `InboxTransportPort`.

## Conexão

Tela de Integrações:
- “Conectar WhatsApp Web”;
- abrir modal de QR;
- status `connecting`;
- confirmação do número conectado;
- `connected` somente após health;
- “Reconectar”;
- “Desconectar” com confirmação;
- “Gerar novo QR” quando necessário.

Persistir:
- account/session id;
- número normalizado;
- nome do dispositivo quando disponível;
- último heartbeat;
- versão do conector;
- erro de sessão.

## Entrada de mensagens

Receber:
- texto;
- áudio;
- imagem;
- vídeo;
- documento.

Normalizar:
- JID/número;
- external message id;
- timestamp;
- tipo;
- conteúdo;
- mídia;
- direção.

Regras:
- idempotência por external id;
- contato existente -> localizar lead;
- número desconhecido -> criar lead/entrada não atribuída com origem `WhatsApp`;
- criar/obter conversa;
- persistir mensagem;
- atualizar `last_message_at`;
- emitir evento interno para automações quando aplicável;
- não responder automaticamente só porque o lead nasceu.

## Saída de mensagens

- texto;
- mídia suportada;
- documento;
- status `pending -> sent/failed`;
- external id salvo;
- falha atualiza health sem apagar histórico;
- retry deve ser explícito/idempotente;
- SalesBot e Inbox usam o mesmo transport adapter.

## Mídia

- baixar mídia recebida de forma server-side;
- armazenar arquivo em Storage apropriado;
- salvar metadados e URL controlada;
- validar tamanho/MIME;
- não depender de URL temporária do provedor como histórico definitivo.

## Reconnect e resiliência

- backoff de reconexão;
- detectar logout/invalid session;
- exigir novo QR quando a sessão foi revogada;
- health heartbeat;
- não mostrar conectado após processo morrer;
- restart do serviço sem perder conversa.

## Escopo inicial excluído

- grupos;
- chamadas;
- status/stories;
- catálogo WhatsApp;
- broadcast em massa;
- automação para spam;
- recursos que não sejam necessários ao atendimento 1:1.

## Dependência de infraestrutura

O destino de hospedagem precisa suportar processo Node de longa duração e conexão persistente. Se o plano atual da Hostinger for apenas hospedagem estática/compartilhada sem processo persistente, o conector deve rodar em VPS/serviço separado. Essa verificação é bloqueador de produção, não de desenvolvimento do contrato.

## Critérios de aceite F08

- QR real pareia;
- status muda automaticamente;
- mensagem real recebida aparece na Inbox;
- mensagem real enviada pela Inbox chega ao destino;
- mídia básica testada;
- dedupe testado;
- reinício do connector recupera sessão;
- logout força `reauth_required`;
- SalesBot usa o mesmo transporte;
- nenhum falso “enviado”.

---

# F09 — Meta Lead Ads + Atribuição de Campanha

**Chave:** `HARP-F09-META-LEADS`  
**Objetivo:** captar leads de anúncios Meta em tempo real e entregá-los ao CRM com atribuição completa.

## Escopo inicial

Prioridade 1:
- Meta Lead Ads / Instant Forms;
- Page;
- formulário;
- campanha;
- conjunto;
- anúncio;
- origem.

Não incluir inicialmente:
- postagem orgânica;
- moderação de comentários;
- DMs do Instagram;
- publicação de conteúdo;
- edição de campanhas.

Insights de mídia podem ser uma segunda etapa depois que a captação de leads estiver estável.

## Conexão

Tela:
- “Conectar Meta”;
- fluxo server-side de autorização;
- seleção/validação dos ativos autorizados;
- mostrar conta/página conectada;
- permissões concedidas;
- último webhook;
- último lead;
- erros;
- reconectar/desconectar.

## Webhook

Criar endpoint público HTTPS:
- challenge de verificação;
- assinatura/autenticidade validada;
- evento `leadgen`;
- resposta rápida;
- processamento durável/idempotente.

Fluxo:
1. Meta envia `leadgen_id`;
2. backend registra evento;
3. worker busca detalhes do lead via Graph API;
4. normaliza campos;
5. resolve atribuição;
6. chama o contrato CRM existente;
7. registra external lead id para dedupe;
8. evento CRM alimenta Automatize/SalesBot conforme configuração.

## Dados a preservar

- external lead id;
- page id;
- form id/form name quando disponível;
- campaign id/name quando disponível;
- ad set id/name quando disponível;
- ad id/name quando disponível;
- created time;
- campos do formulário;
- origem `meta_lead_ads`;
- payload mínimo necessário para auditoria;
- timestamp de ingestão.

Não armazenar segredo no payload.

## Idempotência

Chave única por provider + external lead id.

Reentrega de webhook:
- não duplica lead;
- pode atualizar metadata ausente;
- registra nova tentativa no log.

## Tokens e versão de API

- usar versão suportada do Graph API fixada por configuração;
- não depender de versão implícita;
- monitorar expiração/revogação;
- não expor token no browser;
- saúde da integração deve detectar falta de permissão/reatorização.

## Backfill

Adicionar ação administrativa:
- importar leads recentes por formulário/período permitido;
- dedupe obrigatório;
- usar mesma transformação do webhook.

## Critérios de aceite F09

- webhook verificado;
- lead de teste real chega ao CRM uma única vez;
- origem/campanha/formulário preservados;
- outbox/automação recebe evento;
- falha de Graph API aparece em log e pode ser reprocessada;
- token revogado muda health;
- frontend não contém segredo.

---

# F10 — QA Operacional, Release e Publicação

**Chave:** `HARP-F10-QA-RELEASE`  
**Objetivo:** provar que a aplicação integrada funciona no navegador e publicar somente o que foi validado.

## Build reprodutível

- instalação limpa;
- gerar/versionar lockfile;
- `npm run typecheck`;
- `npm run build`;
- verificar Node suportado;
- revisar envs necessários;
- zero segredo no bundle.

## E2E por persona

### Admin
- login;
- dashboard;
- CRM;
- Inbox;
- Catálogo;
- SalesBot;
- Automatize;
- IA;
- Integrações;
- usuários/permissões;
- configurações.

### Viewer
- vê somente o que deve;
- ações de escrita indisponíveis;
- URL direta não contorna permissão.

### Cliente
- cadastro/login;
- retorno ao imóvel;
- favoritos;
- área cliente;
- nenhuma rota interna.

## E2E de integração

### WhatsApp
- conectar;
- receber;
- enviar;
- mídia;
- reiniciar connector;
- desconectar;
- reautenticar.

### Meta
- conectar;
- webhook;
- criação de lead;
- dedupe;
- metadata;
- erro/reprocessamento;
- revogação de token.

### Automação
- Meta/WhatsApp cria evento;
- regra elegível inicia SalesBot;
- mensagem usa transporte real;
- delay retoma;
- logs refletem resultado real.

## Concorrência

- duas sessões internas;
- uma conversa recebendo mensagem enquanto outro operador atualiza CRM;
- Realtime;
- sem perda de mensagem;
- sem overwrite de lead;
- sem pedido constante de reload.

## UI

- desktop;
- tablet;
- mobile;
- contraste;
- foco;
- estados loading/empty/error/success;
- ações destrutivas;
- console do navegador.

## Publicação

- definir origem única do deploy;
- não usar `gh-pages` antigo como release por acidente;
- build da `main` validada;
- publicar na Hostinger/infra aprovada;
- smoke test no domínio `harpiapatrimonial.com`;
- redirects/auth callbacks;
- HTTPS;
- webhooks apontando para endpoints finais;
- rollback documentado.

## Governança final

- branch protection da `main` quando compatível com o fluxo do projeto;
- manter regra sem GitHub Actions;
- arquivar/deletar branches temporárias somente após confirmação;
- atualizar README/status/decisões;
- handoff com versão publicada e checklist.

## Critérios de aceite F10

Só recebe 🟢 quando:
- build/typecheck passaram;
- E2E principal passou;
- WhatsApp real passou;
- Meta real passou;
- responsividade revisada;
- domínio final testado;
- sem erro crítico no console/log;
- documentação atualizada.

---

# 4. Dependências e paralelismo

## Pode começar imediatamente em paralelo

- F06 UX Operacional;
- F07 Integration Core / normalização;
- F09 Meta: endpoint, contratos e infraestrutura, mesmo antes das credenciais finais;
- F10 baseline de build/typecheck e checklist.

## F08 depende de

- contrato/persistência de F07;
- ambiente que rode processo persistente;
- acesso ao número/conta para QR durante validação real.

## F09 validação real depende de

- App Meta e ativos/permissões reais;
- Page/formulário de teste ou lead real;
- callback HTTPS final.

## F10 fechamento depende de

- F06 + F07 + F08 + F09.

## Ordem crítica recomendada

`F07 -> F08 -> F10`

Em paralelo:

`F06 -> F10`

`F09 -> F10`

## 5. Definition of Done comum

Cada frente precisa registrar:

- branch;
- commits;
- arquivos/migrations alterados;
- contratos alterados;
- testes executados;
- testes não executados;
- logs/evidências;
- riscos;
- rollback;
- dependências;
- próximo passo.

Sem teste real, marcar `NÃO VERIFICADO`.

## 6. Semáforo inicial das novas frentes

| Frente | Estado em 19/09/2026 |
|---|---|
| F06 — UX Operacional | 🔴 NÃO INICIADA |
| F07 — Integration Core / persistência | 🔴 NÃO INICIADA |
| F08 — WhatsApp Web | 🔴 NÃO INICIADA |
| F09 — Meta Lead Ads | 🔴 NÃO INICIADA |
| F10 — QA / Release | 🔴 NÃO INICIADA |

A auditoria e este planejamento não contam como implementação dessas frentes.

## 7. Resultado final esperado

Ao encerrar a Fase 2:

- área interna organizada por fluxo;
- botões e ações com padrão único;
- Inbox persistindo mensagens em estrutura adequada;
- WhatsApp Web realmente conectado;
- leads da Meta chegando automaticamente ao CRM;
- CRM/Inbox/Automatize/SalesBot operando sobre a mesma fonte de verdade;
- integrações com health e logs reais;
- build reprodutível;
- E2E validado;
- produção publicada no domínio oficial.
