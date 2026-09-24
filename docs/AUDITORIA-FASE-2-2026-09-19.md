# Hárpia Patrimonial — Auditoria da Base Consolidada

Data: 19/09/2026  
Base auditada: `main` @ `212523a9dcf1bbce7db34a6df1d34dac1177503f`  
Ambiente: GitHub + Supabase operacional `Harpia Patrimonial`

## 1. Resumo executivo

A plataforma não está em estado de reconstrução. As cinco frentes anteriores foram reconciliadas na `main`, o backend central está operacional e os contratos principais entre CRM, Inbox, SalesBot, Automatize e IA existem.

A próxima fase deve concentrar esforço em cinco pontos:

1. reorganizar a experiência interna e a hierarquia dos botões;
2. substituir os estados preparatórios de integração por conexões reais e observáveis;
3. conectar WhatsApp Web ao contrato de transporte já existente na Inbox;
4. conectar Meta Lead Ads ao CRM e à automação sem criar uma segunda fonte de verdade;
5. concluir QA real de navegador, build reprodutível e publicação.

Há um ponto técnico que deve ser resolvido antes de colocar tráfego real de WhatsApp na Inbox: CRM e Inbox ainda persistem o estado operacional inteiro em dois documentos JSONB de `platform_module_state`. Esse modelo foi adequado para o MVP, mas é inadequado como persistência definitiva para mensagens frequentes e múltiplos operadores porque cada alteração regrava o estado do módulo e usa optimistic locking por uma única revisão.

## 2. Semáforo geral

Legenda:
- 🟢 completo e validado;
- 🟠 implementado/parcial ou ainda sem validação final;
- 🔴 não conectado/não implementado.

| Área | Estado | Auditoria |
|---|---|---|
| Base consolidada em `main` | 🟢 | PR #5 integrou as cinco frentes. `main` é a fonte de verdade. |
| Supabase | 🟢 | Projeto ACTIVE_HEALTHY, Postgres 17.6.1 em `sa-east-1`. |
| Auth / RBAC / RLS | 🟢 | Fluxos server-side validados; 22 permissões cadastradas; Security Advisor sem lints. |
| Catálogo / Storage | 🟢 backend | Regras de publicação/integridade e Storage foram validados; base operacional está vazia. |
| CRM | 🟢 núcleo / 🟠 persistência para escala | CRUD e eventos estão funcionais; persistência ainda é documento JSONB único. |
| Inbox | 🟢 domínio / 🟠 persistência / 🔴 transporte | Domínio, UI e proteção contra falso envio existem; canal real ainda não existe. |
| SalesBot / Automatize | 🟢 runtime | Runtime, worker, grafo, delay e integração com CRM foram validados. |
| Agentes IA | 🟢 estrutura / 🟠 configuração operacional | Runtime e cofre existem; não há agentes reais configurados. |
| Integrações UI | 🟠 | Tela existe, mas WhatsApp/Meta são apenas estados declarativos. |
| WhatsApp público | 🟢 | Click-to-chat usa o número real de `organization_settings`. |
| WhatsApp Web para Inbox | 🔴 | Nenhum transporte real conectado. |
| Meta / Lead Ads | 🔴 | Nenhum OAuth/webhook/lead retrieval conectado. |
| Navegação interna | 🟠 | Funciona, mas possui 12 rotas em uma lista plana e sem agrupamento operacional. |
| Design de ações/botões | 🟠 | Existem padrões diferentes entre núcleo, CRM, Inbox e F05. |
| Build/typecheck limpo | 🟠 NÃO VERIFICADO | Continua pendente no checkout completo da `main`. |
| E2E navegador | 🟠 NÃO VERIFICADO | Admin/viewer/cliente, responsividade, upload, sessões e console ainda precisam de execução real. |
| Publicação | 🟠 | `gh-pages` está divergida e muito atrás da `main`; publicação final em Hostinger ainda deve ser validada. |

## 3. O que está efetivamente pronto

### 3.1 Fundação e segurança

- autenticação de cliente e usuário interno;
- guards de rotas;
- permissões por grupo e exceção;
- RLS na camada pública operacional;
- Edge Functions críticas ativas;
- `service_role` mantida no servidor;
- Vault/scheduler F05 testados;
- Security Advisor atual sem lints.

As tabelas privadas `private.ai_credential_refs` e `private.f05_scheduler_auth` aparecem sem RLS na listagem estrutural. A auditoria de grants confirmou, porém, que `anon` e `authenticated` não têm SELECT/INSERT/UPDATE nessas tabelas. Portanto, não foi constatada exposição direta por esses papéis. RLS pode ser tratado depois como defesa adicional, sem aplicar mudança automática que possa quebrar o runtime.

### 3.2 CRM e conversão

- criação/edição de lead;
- funis e etapas;
- tags;
- campos personalizados;
- tarefas;
- responsável;
- histórico;
- eventos para automação;
- `public-lead-ingest` cria lead e outbox sem disparar mensagem automaticamente;
- cadastro do cliente foi conectado ao CRM;
- integração CRM -> Automatize -> SalesBot foi validada.

Estado atual da base: zero leads, zero funis, zero etapas, zero tags, zero tarefas e zero histórico operacional.

### 3.3 Inbox

A Inbox já possui o contrato certo para receber um canal real:

- `InboxTransportPort.send()`;
- ingestão de mensagem recebida;
- deduplicação por `externalMessageId`;
- estados `not_connected | connected | error`;
- mensagens de texto, áudio, imagem, vídeo, documento e formulário;
- integração com CRM no painel lateral;
- iniciar/pausar SalesBot e IA;
- bloqueio explícito de envio quando não existe transporte real.

Isso permite implementar WhatsApp Web como adaptador de transporte sem reescrever o domínio da Inbox.

### 3.4 SalesBot / Automatize / IA

- `automation-event-worker` v4 ativo;
- `f05-runtime-worker` ativo;
- `f05-delay-worker` ativo;
- cron `f05-delay-resume-30s` ativo;
- grafo com proteção contra ciclo inválido;
- delay durável testado;
- bloco de mensagem sem canal real pausa e retorna `not_configured`, sem falso envio;
- execução F05 integrada ao CRM/Inbox;
- cofre de credenciais de IA e runtime de modelos presentes.

Base atual: zero SalesBots, automações, agentes e execuções reais. Isso é coerente com a regra de não criar operação fictícia.

## 4. Problemas e riscos encontrados

### P0 — Persistência da Inbox/CRM não deve receber volume real de WhatsApp no formato atual

`platform_module_state` mantém somente dois registros: `crm` e `inbox`, cada um contendo todo o estado do módulo em JSONB. A aplicação usa revisão otimista da linha inteira.

Com WhatsApp real, cada mensagem recebida/enviada pode provocar atualização do documento inteiro de Inbox. Em múltiplas sessões, qualquer concorrência pode resultar em conflito de revisão e pedido de reload.

**Decisão recomendada:** antes de liberar WhatsApp para produção, normalizar pelo menos conversas e mensagens em tabelas próprias. Leads, histórico e tarefas do CRM também devem migrar para estrutura normalizada de forma incremental, mantendo adapters compatíveis durante a transição.

### P0 — WhatsApp Web não possui serviço de transporte real

A UI e o domínio estão preparados, mas não existe:

- processo persistente de sessão;
- pareamento por QR;
- reconexão;
- normalização de JID/telefone;
- ingestão de eventos;
- envio real;
- download/upload de mídia;
- ACK/status;
- healthcheck;
- armazenamento seguro de sessão.

Esse conector deve rodar em processo Node de longa duração. Não deve ser implementado como Edge Function efêmera.

### P0 — Meta não está conectada

Não existe:

- fluxo de conexão/autorização;
- seleção de Page/conta/formulário;
- webhook de `leadgen`;
- busca do lead pelo ID recebido;
- deduplicação;
- mapeamento de campanha/anúncio/formulário;
- ingestão no CRM;
- status da conexão;
- monitoramento de token/webhook.

### P1 — Tela de Integrações é preparatória, não operacional

Atualmente ela salva notas e estados `not_connected/pending/future` em `harpia:f05:integrations`.

Ela não possui:
- botão real Conectar;
- fluxo de autenticação/QR;
- conta conectada;
- último evento recebido;
- último erro;
- status de saúde;
- reconectar/desconectar;
- webhook status;
- escopos/permissões concedidos.

O estado `connected` corretamente não pode ser forçado manualmente. Na próxima fase ele deve ser derivado do backend real.

### P1 — Hierarquia interna fragmentada

A sidebar possui 12 entradas no mesmo nível:

Visão geral, Catálogo, CRM, Inbox, SalesBot, Automatize, Agentes IA, Execuções, Integrações, Usuários, Funções e permissões, Configurações.

Além disso, há três famílias de estilo de ações:
- componentes globais `.button`;
- botões próprios do CRM;
- botões próprios de F05;
- controles próprios da Inbox.

Isso explica a percepção de botões espalhados e ausência de hierarquia.

### P1 — Deploy publicado não representa a base consolidada

A branch `gh-pages` está divergida da `main`: a comparação atual mostra `main` 370 commits à frente do ponto de comparação, enquanto `gh-pages` também possui 10 commits fora da linha atual.

Não foi comprovado nesta auditoria qual artefato está servido no domínio final da Hostinger. Portanto, publicação atual deve permanecer **NÃO VERIFICADA** até deploy controlado da base final.

### P1 — QA de frontend ainda incompleto

Ainda não há comprovação final de:
- instalação limpa;
- lockfile;
- typecheck completo;
- build completo;
- E2E autenticado;
- responsividade final;
- duas sessões simultâneas;
- upload real pela UI;
- console sem erros;
- recovery/e-mail;
- sessão fechar/reabrir.

### P2 — Governança do repositório

- `main` está sem branch protection;
- existem várias branches históricas/noop;
- não há `package-lock.json`.

Não bloquear a integração por isso, mas tratar antes do release final.

## 5. Arquitetura que deve ser preservada

Não reescrever os módulos que já funcionam.

As novas integrações devem entrar pelos contratos existentes:

- Meta -> endpoint server-side -> normalizador -> `public-lead-ingest`/serviço CRM -> outbox -> automações;
- WhatsApp Web -> serviço persistente -> adapter `InboxTransportPort` + ingestão de eventos -> Inbox/CRM;
- SalesBot continua chamando o transporte por porta interna;
- UI nunca recebe tokens secretos;
- estado “conectado” vem de health real, não de botão manual;
- nenhuma mensagem deve ser marcada como enviada antes da confirmação do transporte.

## 6. Conclusão da auditoria

A base estrutural é aproveitável e a maior parte do trabalho anterior não deve ser refeita.

A ordem correta agora é:

1. normalizar persistência de alto volume e definir contrato comum de integrações;
2. reorganizar navegação e sistema de ações;
3. ligar WhatsApp Web;
4. ligar Meta Lead Ads;
5. fazer QA ponta a ponta e publicar a versão operacional.

O escopo de execução desta fase está em `docs/ESCOPO-FASE-2-INTEGRACOES-UX-2026-09-19.md`.
