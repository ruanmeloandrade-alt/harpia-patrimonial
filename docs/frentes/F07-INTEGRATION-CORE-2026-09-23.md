# HARP F07 Integration Core

Data: 23/09/2026

Branch: `work/f07-integration-core-20260923`

Status: 🟠 PARCIAL / EM ANDAMENTO

## Objetivo

Retirar a Inbox do gargalo de persistência por documento JSONB antes de tráfego real de WhatsApp e criar o registro comum de saúde das integrações.

## Implementado

* Criadas tabelas normalizadas:
  * `integration_connections`
  * `integration_events`
  * `inbox_channel_accounts`
  * `inbox_conversations`
  * `inbox_messages`
  * `inbox_message_attachments`
* Criados índices para:
  * `provider + external_message_id`
  * `provider + external_thread_id`
  * `lead_id`
  * `conversation_id + created_at`
  * `last_message_at`
* RLS e grants revisados para leitura e gestão conforme permissões existentes.
* Realtime habilitado para conversas, mensagens, anexos e estado das conexões.
* Estado legado da Inbox foi preservado.
* Import inicial do estado legado incluído na migration.
* Criado `SupabaseNormalizedInboxRepository`.
* A hidratação integrada da Inbox passou a usar as tabelas normalizadas na branch.
* O runtime passou a observar as novas tabelas por Realtime.
* Tipos TypeScript do Supabase foram sincronizados.
* A tela de Integrações passou a ler WhatsApp e Meta de `integration_connections`.
* O frontend não pode marcar WhatsApp ou Meta como `connected` manualmente.
* Estados operacionais suportados:
  * `not_connected`
  * `connecting`
  * `connected`
  * `degraded`
  * `reauth_required`
  * `error`

## Validações executadas

* Migration `f07_integration_core_inbox_normalization`: aplicada com sucesso.
* Migration `f07_inbox_attachment_realtime`: aplicada com sucesso.
* Migration `f07_integration_connections_realtime`: aplicada com sucesso.
* Security Advisor: 0 lints após as mudanças.
* Realtime confirmado em:
  * `inbox_conversations`
  * `inbox_messages`
  * `inbox_message_attachments`
  * `integration_connections`
* Smoke transacional de conversa, mensagem, anexo e atualização: executado com rollback.
* Conferência pós smoke: 0 conversas, 0 mensagens e 0 anexos de QA.
* Base operacional original estava vazia na migração, portanto não houve dado real para perder.

## NÃO VERIFICADO

* `npm run typecheck`
* `npm run build`
* navegação autenticada em navegador
* duas sessões observando Realtime simultaneamente
* persistência real pela UI

Motivo: o ambiente de shell disponível não conseguiu resolver `github.com` para baixar o checkout e instalar dependências. Nenhum teste foi declarado como aprovado sem execução.

## Pendências da F07

* Normalização incremental do CRM: concluída em 24/09/2026.
* Fazer teste autenticado de RLS com usuário viewer e manager.
* Rodar typecheck e build em checkout com acesso à rede.
* Executar E2E da Inbox normalizada.
* Antes do merge, reconciliar novamente qualquer estado legado criado depois da migration.
* Só remover a escrita antiga após validação do adapter normalizado.

## Dependência liberada

A condição P0 para iniciar o desenvolvimento da F08 foi atendida na branch: novas mensagens não precisam ser persistidas regravando o array completo da Inbox.

A F08 deve partir desta branch enquanto a F07 permanece sem merge na `main`.

## Rollback

A `main` continua usando `platform_module_state`. As tabelas novas são aditivas e o documento legado não foi removido. Reverter a branch não exige apagar as tabelas normalizadas.

## Commits principais

* `6dab571b02318323850948b7c7e697e820147aef` schema inicial F07
* `90c4387a1b03d8c9eb1af0ed2817694a863bacde` tipos Supabase
* `2c6f80fea5a3cc3e0d6578cbf5a035e90655352c` repository normalizado da Inbox
* `5bc30bd2d70ef49a78fe2fd0647277ab25307854` hidratação normalizada
* `f89f44d003ab9f5267fdaed610f1c289a3875a64` Realtime da Inbox
* `109a8b06b87e4583f2718a159cc6c18357f01680` status de integrações pelo backend
* `6813749ae5ae7022c9e2f2993021dc09b5dda78a` saúde real na tela de Integrações


## Atualização 24/09/2026

### CRM normalizado

A F07 passou a retirar também o CRM do documento JSONB monolítico.

Criadas tabelas normalizadas:

* `crm_pipelines`
* `crm_pipeline_stages`
* `crm_leads`
* `crm_tags`
* `crm_lead_tags`
* `crm_custom_fields`
* `crm_lead_custom_field_values`
* `crm_tasks`
* `crm_history`

O adapter `SupabaseNormalizedCrmRepository` foi criado e `hydrateSharedCrmRepository()` passou a hidratar o CRM pelas tabelas normalizadas.

O runtime passou a observar as tabelas normalizadas do CRM por Realtime.

### Compatibilidade durante transição

O documento legado `platform_module_state.crm` não foi removido.

A RPC `admin_ingest_public_lead` passou a fazer dual write durante a transição:

* grava o lead e o histórico nas tabelas normalizadas;
* mantém a gravação no JSON legado para preservar compatibilidade com a `main` atual.

Nenhum dado real do CRM precisou ser migrado: no momento da normalização o estado continha 0 funis, 0 etapas, 0 leads, 0 tags, 0 campos personalizados, 0 tarefas e 0 entradas de histórico.

### Banco e performance

Migrations aplicadas:

* `f07_crm_normalization_and_fk_indexes`
* `f07_crm_lead_tag_position`

Também foram adicionados os índices de FK que o Performance Advisor havia apontado em:

* `inbox_channel_accounts.connection_id`
* `inbox_conversations.channel_account_id`
* `integration_events.connection_id`

Após a correção, o Advisor não aponta mais foreign keys sem índice. Permanecem apenas avisos INFO de índices ainda não utilizados, compatíveis com a base ainda vazia.

### Validações executadas em 24/09/2026

* Security Advisor: 0 lints.
* Smoke transacional completo do CRM normalizado: pipeline, etapa, lead, tag, campo personalizado, tarefa e histórico, com rollback.
* Smoke da RPC pública em dual write: normalizado + legado confirmados na mesma transação, com rollback.
* Resíduo de QA após os testes: 0 linhas.
* Realtime configurado para as tabelas normalizadas do CRM.
* Tipos TypeScript do Supabase regenerados após a normalização.

### Ainda NÃO VERIFICADO

* `npm run typecheck`
* `npm run build`
* navegação autenticada em navegador
* duas sessões autenticadas observando Realtime simultaneamente
* RLS end to end com perfis reais viewer e manager
* persistência real pela UI em sessão autenticada

O ambiente de shell disponível continua sem resolver `github.com`, portanto o checkout com dependências para build/typecheck não pôde ser executado. O projeto Supabase também ainda não possui perfis internos reais para um teste end to end de RLS sem criar usuário fictício.

### Commits da continuação

* `3954e50b7d5d0ae68ea1a83fe836bbdaf064b48c` adapter normalizado do CRM
* `786c18b93a413f04df81751e121bea760612bfa1` hidratação normalizada do CRM
* `d45a5ee726cf822642317da59ea942548fe213bc` Realtime das tabelas normalizadas do CRM
* `39e59f127b931fa6da039a78b58386e72b707213` tipos Supabase sincronizados
* `b17a4fc63b36ce7acfa204c88467b4c21ceda7cf` schema CRM normalizado versionado
