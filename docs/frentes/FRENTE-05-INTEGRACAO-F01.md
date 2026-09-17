# Frente05 → Frente01 — handoff final de integração

Data: 17/09/2026
Origem: `frente-05`
Destino: `frente-01`

## Status

**FINALIZADA NO ESCOPO DA FRENTE05 E INTEGRADA ESTRUTURALMENTE NA FRENTE01.**

A integração foi concluída sem merge forçado da branch histórica divergida.

- PR #3: **MERGEADO** na `frente-01`.
- Merge do PR #3: `d7fd734a2b71c1d559647525e9513de7464dad63`.
- `automation-event-worker`: implantado no Supabase como **v4 ACTIVE** depois do merge do PR #3.
- PR #4: **MERGEADO** na `frente-01`.
- Merge do PR #4: `8b93fc9a56a419a1416c9f4437611d336150026b`.
- PR #1 amplo/divergido: **FECHADO COMO OBSOLETO, NÃO MERGEADO**.

O PR #4 foi criado em cima da `frente-01` atual, estava 1 commit à frente e 0 atrás e reconciliou somente módulos pertencentes à F05 e seus schemas/funções server-side.

## O que foi entregue

- SalesBot com CRUD, editor visual e validações;
- blocos configuráveis e encadeamento entre fluxos;
- runtime de execução com contexto persistido;
- pausa/retomada de delays;
- lease/claim para impedir retomadas concorrentes duplicadas;
- scheduler durável server-side via `pg_cron` + `pg_net`;
- Automatize ligado a eventos e ações de CRM;
- agentes de IA e perfis de provedor;
- credenciais de IA resolvidas somente no backend/Vault;
- integridade de referências entre bots, agentes e provedores;
- prevenção de ciclos de encadeamento;
- SSRF hardening, HTTPS obrigatório, redirect manual e timeout em chamadas externas;
- storage compartilhado com revisão otimista e default-deny;
- logs sem histórico operacional fictício;
- tela/estado de integrações sem fingir WhatsApp/Meta conectados;
- runtime server-side `f05-runtime-worker`;
- worker durável `f05-delay-worker`;
- conexão do `automation-event-worker` oficial da F01 com `start_salesbot` e `invoke_ai` da F05;
- tombstones para endpoints legados de IA que não devem voltar ao fluxo ativo.

## Blocos implementados

- gatilho;
- condição;
- espera/delay;
- mensagem;
- agente IA;
- mover etapa;
- atribuir responsável;
- criar tarefa;
- atualizar campo;
- adicionar/remover tag;
- webhook/API;
- finalização;
- iniciar/encadear outro fluxo.

## Eventos CRM consumidos

A estrutura do Automatize aceita eventos configuráveis, incluindo:

- lead criado;
- mudança de etapa;
- alteração de campo;
- tag adicionada/removida;
- ausência de interação;
- tarefa/data/evento futuro;
- eventos adicionais extensíveis por contrato.

## Ações CRM expostas/consumidas

- criar tarefa;
- mover etapa;
- atualizar campo;
- adicionar tag;
- remover tag;
- atribuir responsável;
- iniciar SalesBot;
- chamar agente IA;
- webhook/API.

## Contratos para Inbox

A F05 expõe os contratos necessários para a camada de Inbox:

- iniciar SalesBot;
- pausar SalesBot;
- consultar status do SalesBot;
- acionar IA;
- pausar IA;
- consultar status da IA.

## Runtime server-side

Endpoint interno:

`POST /functions/v1/f05-runtime-worker`

Autenticação interna:

`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Respostas válidas:

`accepted | rejected | not_configured`

### start_salesbot

```json
{
  "action": "start_salesbot",
  "botId": "<id>",
  "leadId": "<opcional>",
  "conversationId": "<opcional>",
  "context": {}
}
```

### invoke_ai

```json
{
  "action": "invoke_ai",
  "agentId": "<id>",
  "context": {}
}
```

## Validações reais já executadas na F05

- delay vencido retomado até `completed`;
- dois delays consecutivos respeitados;
- concorrência de dois workers sem execução duplicada;
- encadeamento server-side pai → filho concluído;
- canal de mensagem desconectado pausa em `retry_current` em vez de simular envio;
- scheduler com token inválido retorna `401`;
- runtime com bearer inválido retorna `401`;
- cron `f05-delay-resume-30s` ativo com execuções `succeeded`;
- RLS/default-deny da estrutura F05;
- segredo do scheduler inacessível a `anon`/`authenticated`;
- Security Advisor sem lints na última conferência registrada;
- fixtures temporárias removidas após os testes;
- coleções operacionais sem dados fictícios ao fim dos testes.

## Integrações preparadas

- WhatsApp;
- Meta;
- e-mail;
- APIs externas;
- provedores IA OpenAI/OpenAI-Codex, Anthropic/Claude, Google Gemini e customizado.

WhatsApp e Meta permanecem sem credenciais, autenticação, webhooks ou tráfego real nesta fase, conforme regra do projeto.

## O que ficou pendente fora do escopo executável da F05

Estes itens pertencem à etapa final/global de ambiente e **não devem ser tratados como concluídos sem teste real**:

- build/typecheck consolidado do produto inteiro;
- navegação visual autenticada em browser;
- E2E RBAC admin/viewer no produto consolidado;
- persistência/concorrência via browser autenticado;
- chamada real a provedor de IA com chave real;
- WhatsApp real;
- Meta real.

O backend atual voltou a ter `auth.users = 0` e `user_profiles` ativos = 0 depois da remoção dos usuários temporários de QA. A F05 não cria bypass de Auth e não insere diretamente em `auth.users`.

## Riscos conhecidos

- qualquer alteração futura no contrato do CRM/Inbox precisa preservar as interfaces já usadas pela F05;
- reintroduzir os endpoints legados de IA pode duplicar caminhos de execução;
- WhatsApp/Meta só devem ser marcados como conectados depois de integração real;
- não reabrir nem mergear o PR #1 histórico.

## Instruções para integração/fase final

1. Usar `frente-01` após os merges #3 e #4 como base estrutural integrada.
2. Não usar o PR #1 como fonte de merge.
3. Fazer o build/typecheck consolidado quando houver ambiente com dependências do projeto.
4. Executar E2E autenticado com usuários temporários pelo fluxo oficial da F01 e removê-los ao final.
5. Só então avançar para credenciais reais de IA e, por último, WhatsApp/Meta.
