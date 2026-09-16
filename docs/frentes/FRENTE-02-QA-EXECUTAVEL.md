# Frente02 — QA executável

Data: 16/09/2026
Branch: `frente-02`

## Objetivo

Registrar somente verificações realmente executadas sobre o escopo da Frente02, sem promover itens dependentes de navegador, publicação ou dados operacionais a `COMPLETO E TESTÁVEL`.

## QA local descartável — lógica pura

Foi executado um harness local descartável sobre a lógica atual da Frente02, sem gravar mocks no repositório e sem alterar dados de produção.

### Resultado

25 asserções passaram.

Cobertura executada:

- normalização de finalidade `Venda` / `Locação`;
- sanitização de cidade e textos de filtro;
- correção automática de faixa de preço invertida;
- leitura e escrita dos filtros na URL;
- descarte de filtros inválidos;
- pipeline CRM → WhatsApp na ordem correta;
- falha no CRM impede continuação para WhatsApp;
- falha somente no redirecionamento externo não invalida lead já aceito;
- normalização do telefone para URL `wa.me`;
- sanitização do contexto enviado ao WhatsApp;
- rejeição de número inválido;
- preenchimento de contato por cliente autenticado;
- remoção de metadata pública de identidade (`clientId`, `role`);
- bloqueio explícito quando nome/WhatsApp não existem;
- adaptação F03 → catálogo público;
- unidade órfã não aparece publicamente;
- relação unidade → empreendimento preservada;
- capa de mídia priorizada;
- lookup público case-insensitive por código;
- faixa de preço evita preço do empreendimento quando há unidade publicada;
- localizações derivadas por cidade.

## QA real no Supabase

Projeto verificado: `Harpia Patrimonial`.

### Segurança

- Supabase Security Advisor: **0 lints**.
- RLS confirmado ativo em `catalog_items`, `client_favorites` e `user_profiles`.
- `admin_ingest_public_lead` confirmado como `SECURITY DEFINER`.
- `anon`: sem `EXECUTE` no RPC privilegiado.
- `authenticated`: sem `EXECUTE` no RPC privilegiado.
- `service_role`: com `EXECUTE` no RPC privilegiado.

### Ingestão CRM descartável

Foi executado um teste transacional do RPC `admin_ingest_public_lead` usando contexto `service_role`.

Dentro da subtransação foi validado que:

1. um `lead_*` foi criado;
2. a revisão do módulo CRM avançou em `+1`;
3. a lista de leads avançou em `+1`;
4. um evento `lead.created` entrou em `automation_event_outbox`.

Em seguida a subtransação foi revertida propositalmente.

Validação pós-rollback:

- revisão CRM voltou para `0`;
- quantidade de leads voltou para `0`;
- evento de QA foi removido do outbox;
- nenhum dado fictício permaneceu no backend.

## Runtime publicado conferido

Edge Functions observadas:

- `public-lead-ingest`: ACTIVE, versão 3;
- `client-area-data`: ACTIVE, versão 2.

`public-lead-ingest` publicado corresponde ao código integrado atual observado na Frente01 para o fluxo relevante da F2.

## Estado operacional observado

No momento deste QA:

- usuários Auth/perfis: `0`;
- itens do catálogo: `0`;
- itens publicados: `0`;
- favoritos: `0`;
- CRM: `0` leads, revision `0`;
- telefone oficial: `null`.

## O que continua NÃO VERIFICADO

- build/typecheck integrado com Node `>=24 <25`;
- aplicação React publicada/servida no destino final;
- navegador desktop/mobile;
- E2E real de login/cadastro → catálogo → favorito → lead → área do cliente → WhatsApp;
- persistência de favorito com conta operacional;
- detalhe com item real publicado;
- histórico/interesses com lead real autenticado;
- WhatsApp final com número oficial.

## Status visual

- 🟢 Contratos e lógica pura testados nos recortes acima.
- 🟢 RPC de ingestão e segurança do backend testados sem deixar dado fictício.
- 🟠 Site público/área do cliente permanecem implementados e integrados, mas aguardam publicação/dados para QA visual/E2E.
- 🔴 Build/typecheck integrado e browser real continuam NÃO VERIFICADOS.
