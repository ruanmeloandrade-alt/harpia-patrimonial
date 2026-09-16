# Frente05 — QA de segurança da integração

Data: 16/09/2026
Branch proprietária: `frente-05`

Este documento separa falhas de segurança/autorizações encontradas no QA integrado das pendências funcionais comuns.

## 1. Storage compartilhado F05

Status: OK no backend atual.

Validado no Supabase real:

- `anon` não possui SELECT em `public.f05_shared_storage`;
- consulta executada como role `anon` foi recusada;
- `authenticated` sem identidade/JWT válida enxerga 0 linhas;
- `anon` não possui EXECUTE em `public.save_f05_shared_storage(text,jsonb,bigint)`;
- RPC público usa `SECURITY INVOKER`;
- UPDATE é protegido por RLS e `private.can_write_f05_storage(storage_key)`;
- Security Advisor atual: 0 lints.

## 2. RBAC do shell integrado

Status: CORREÇÃO NECESSÁRIA NA FRENTE01.

Encontrado na branch `frente-01`:

- SalesBot exige somente `salesbot.manage` na rota;
- Automatize exige somente `automations.manage`;
- Agentes IA exige somente `ai.manage`;
- Integrações exige somente `integrations.manage`;
- portanto usuários com apenas `*.view` não conseguem acessar o modo leitura suportado pela F05;
- componentes F05 são montados sem `canManage` explícito.

Correção esperada:

- rota/sidebar: permitir `view OR manage`;
- edição: passar `canManage={hasPermission(*.manage)}` explicitamente;
- Execuções: permitir leitura com `salesbot.view`/`automations.view`/`ai.view`; permitir limpeza somente com permissão de gestão apropriada.

Hardening já aplicado na F05: `ExecutionLogsPanel` usa `canManage=false` por padrão.

## 3. Webhook de automação

Status: FUNCIONAL, MAS HARDENING SERVER-SIDE RECOMENDADO ANTES DO VERDE FINAL.

A Edge Function `automation-webhook` já possui:

- JWT obrigatório na integração;
- checagem de usuário interno/ativo;
- permissão `automations.manage` ou `salesbot.manage`;
- apenas `POST`, `PUT`, `PATCH`, `DELETE`;
- HTTPS obrigatório;
- bloqueio de localhost e redes privadas IPv4/IPv6 conhecidas;
- timeout de 15 segundos.

Desvios encontrados:

1. faixa CGNAT `100.64.0.0/10` não é bloqueada pelo `isPrivateIpv4` atual;
2. `fetch` segue redirect automaticamente. Um endpoint público permitido pode responder 30x apontando para host interno e escapar da validação original;
3. validação atual examina hostname literal, mas não comprova que um hostname público resolva para IP público. DNS rebinding/resolução privada deve ser considerado se o produto mantiver webhook arbitrário.

Correção mínima recomendada na Frente01:

- incluir `100.64.0.0/10` no bloqueio IPv4;
- usar `redirect: 'manual'`;
- se redirects forem permitidos, validar novamente cada `Location` antes de seguir;
- preferencialmente resolver DNS e rejeitar IPs privados/reservados antes do request para endpoint customizado.

A Frente05 não deve alterar diretamente a Edge Function proprietária da Frente01.

## 4. Runtime IA server-side

Status: ACEITÁVEL PARA PRIMEIRA PARTE; HARDENING FUTURO REGISTRADO.

`ai-model-invoke` exige usuário interno e uma das permissões operacionais de gestão. O runtime atual recebe `profileId` e instruções/input do cliente, carrega a credencial no Vault e executa o provedor no servidor.

Hardening futuro recomendado:

- receber `agentId` como autoridade principal;
- carregar no servidor a definição canônica do agente e seu `providerProfileId`;
- construir instruções/regras/contexto-base no servidor;
- não confiar em `instructions` arbitrárias vindas do browser;
- aplicar `accessScopes` do agente server-side quando esses scopes passarem a controlar dados reais.

Não alterar esse contrato imediatamente antes da primeira entrega sem sincronização F01/F05, porque seria mudança breaking no runtime integrado.

## 5. Dados fictícios

Status: OK.

Consulta ao backend confirmou as sete coleções F05 vazias, revisão 0, sem SalesBot, automação, agente, execução, perfil ou integração fictícia persistida.
