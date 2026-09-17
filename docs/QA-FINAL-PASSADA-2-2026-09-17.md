# Hárpia Patrimonial — QA final integrada — passada 2

Data: 17/09/2026
Branch: `frente-01`

## Objetivo

Continuar o pente-fino após a primeira rodada de QA real, relendo as regras obrigatórias e revisando fluxos ainda não comprovados pela interface.

## Regras relidas antes de alterar

- `AGENTS.md`
- `docs/REGRAS-DE-PRODUCAO.md`
- `docs/BRIEFING-CONSOLIDADO.md`
- `docs/ESCOPO-DE-TRABALHO.md`
- `docs/CONTRATOS-ENTRE-MODULOS.md`
- `docs/PENTE-FINO-INTEGRACAO.md`
- `docs/STATUS-FRENTES.md`
- `docs/QA-FINAL-2026-09-17.md`

## Falha funcional encontrada

O briefing e os contratos determinam que a criação de conta do cliente final deve gerar lead/contexto no CRM, sem disparar mensagem automaticamente.

Antes desta passada:

- `AuthProvider.signUpClient()` criava a conta;
- `private.handle_new_auth_user()` criava somente `user_profiles`;
- `RegisterPage` não emitia evento de conversão para a Frente04;
- portanto, criar conta isoladamente não gerava lead no CRM.

## Correção aplicada

### `src/features/auth/RegisterPage.tsx`

- passou a aceitar callback opcional `onClientRegistered`;
- normaliza nome, e-mail e WhatsApp usados no cadastro;
- após `signUpClient()` bem-sucedido, emite o evento de cadastro;
- falha de sincronização de CRM não desfaz nem falsifica o estado da conta criada;
- cadastro com confirmação de e-mail informa explicitamente quando a sincronização de CRM falha.

### `src/app/AppRouter.tsx`

- a camada de composição conecta `RegisterPage.onClientRegistered` ao adapter real `ingestPublicLead`;
- evento enviado com `origin=site`, `action=account_created`, `page=/cadastro` e `metadata.source=client-signup`;
- `AuthProvider` permanece independente do CRM;
- criação administrativa de funcionários via `admin-user` permanece separada e não cria lead comercial.

## Validação real

O mesmo payload de integração utilizado pelo novo fluxo foi enviado ao Edge Function real `public-lead-ingest`.

Resultado:

- HTTP `201`;
- lead criado no CRM;
- outbox criado e processado;
- `automaticMessageSent=false`;
- após a validação, lead e outbox temporários foram removidos;
- conferência final: `crm_leads=0` e `outbox_count=0` para o dado de QA.

## Revisões adicionais desta passada

### Auth / guards

- cliente autenticado não recebe acesso interno;
- `InternalRoute` exige perfil `internal` ativo;
- permissões de módulo continuam validadas pelo guard;
- recuperação de senha exige sessão/recovery válida antes da troca.

### Inbox / F05

- seleção de SalesBot e agente IA é explícita por conversa;
- adapter recebe `botId`/`agentId` escolhidos pela Inbox;
- `resolveSalesBotId`/`resolveAiAgentId` indefinidos no runtime não quebram o fluxo porque são apenas fallback;
- permissões operacionais continuam protegidas pelos proxies/ports permissionados.

### Catálogo / mídia

- upload direto exige `catalog.manage`;
- MIME e limite de 50 MB são validados;
- Storage real é injetado pelo runtime Supabase;
- publicação exige `catalog.publish` e continua separada de edição;
- exclusão mantém confirmação;
- remoção de objeto de Storage verifica referência antes de apagar.

## Estado

🟢 Correção `cadastro de cliente -> CRM`: implementada e validada no contrato real de backend/Edge.

🔴 Ainda NÃO VERIFICADO por ausência de ambiente executável compatível:

- formulário de cadastro completo em navegador real;
- `npm run typecheck` com Node 24;
- `npm run build` com Node 24;
- E2E visual desktop/mobile;
- upload real pela UI;
- Realtime observado em duas sessões de navegador;
- sessão/recovery/redirects em navegador real.

Nenhum item acima foi marcado como aprovado sem execução real.
