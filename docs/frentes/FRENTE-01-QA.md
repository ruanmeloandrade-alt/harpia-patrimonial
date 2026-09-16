# Frente01 — QA do núcleo / autenticação / permissões

Data: 16/09/2026

## Backend validado

- Projeto Supabase: `Harpia Patrimonial`
- Ref: `desxomqvtjaymwwxivwq`
- Região: `sa-east-1`
- Status: `ACTIVE_HEALTHY`
- Projeto MKTon não foi alterado.

## Edge Function

- `admin-user`: `ACTIVE`, JWT obrigatório.
- Função temporária `f01-bootstrap-qa`: encerrada após o QA e responde `410`; JWT obrigatório novamente.

## Estrutura do banco

RLS permanece habilitado nas tabelas do núcleo. Seed estrutural preservado:

- permissões: `22`;
- grupo de sistema `Administrador`: `1`;
- permissões allow no grupo Administrador: `22`.

Após o QA:

- `auth.users`: `0`;
- `user_profiles`: `0`;
- grupos temporários QA: `0`;
- memberships temporários: `0`;
- overrides temporários: `0`.

Nenhum usuário/grupo fictício foi deixado na plataforma.

## QA real de Auth/RBAC — executado

Foram criados temporariamente, pela Admin API oficial do Supabase:

1. administrador interno QA;
2. viewer interno QA.

Resultado real do teste:

- admin autenticou com `22` permissões efetivas;
- `users.manage` e `roles.manage` presentes no admin;
- viewer autenticou com `11` permissões de leitura;
- viewer recebeu exatamente as `11` permissões `*.view` esperadas;
- viewer recebeu `0` permissões de gestão/publicação;
- `auth.getUser()` confirmou as duas sessões e identidades corretas;
- todos os usuários/grupos temporários foram removidos ao final.

Resultado: **AUTH + RBAC BACKEND OK**.

## Bug encontrado e corrigido durante o QA

O trigger `private.protect_profile_security_fields()` verificava somente o claim legado `request.jwt.claim.role` para reconhecer `service_role`.

No Supabase atual observado no projeto:

- `request.jwt.claim.role` = `null`;
- `request.jwt.claims.role` = `service_role`;
- `current_setting('role')` = `service_role`.

Consequência antes da correção: a própria Edge Function `admin-user` podia criar o usuário no Auth, mas o hardening bloqueava a mudança de `account_type` para `internal` com `not authorized to change security fields`.

Correção aplicada no backend e versionada em `supabase/schema/core_auth_hardening.sql`: reconhecer o formato atual (`request.jwt.claims.role` / role atual), mantendo compatibilidade com o claim legado e sem liberar usuários comuns.

Commit do fix no GitHub: `af09b2faa7e072125ccb2fc1c91ab74c0d9ab39c`.

## QA de segurança

Security Advisor após a correção e limpeza:

- `0` lints.

O teste anterior sem identidade válida continua garantindo:

- `private.is_internal_user(auth.uid())` → `false`;
- `private.user_has_permission(auth.uid(), 'dashboard.view')` → `false`;
- `private.user_has_permission(auth.uid(), 'users.manage')` → `false`.

## QA de performance

Performance Advisor final mostra somente `INFO` de índices ainda não utilizados, esperado em banco praticamente vazio. Nenhum novo erro de segurança/performance bloqueante foi encontrado.

## Implementado/versionado

- cliente Supabase tipado pelo schema real;
- contrato público de autenticação;
- sessão persistente;
- cadastro/login/logout/recovery;
- rotas cliente/equipe separadas;
- guards;
- gestão de usuários;
- gestão de grupos;
- herança de permissões;
- exceções individuais allow/deny;
- bloqueio de autoelevação/autodesativação;
- reconhecimento correto de `service_role` no hardening;
- Error Boundary global;
- composição estrutural com as demais frentes.

## Ainda NÃO VERIFICADO no ambiente atual

Estes itens dependem de ambiente executável/navegador e não bloqueiam as outras frentes:

- build/typecheck completo no Node suportado;
- persistência de sessão após fechar/reabrir navegador real;
- fluxo real de confirmação/recovery por e-mail;
- redirects finais do Auth no domínio publicado;
- E2E visual pelo navegador do produto consolidado.

## Liberação

A Frente01 não bloqueia as Frentes02–05. Backend Auth/RBAC foi validado com usuários temporários reais e o bug de `service_role` encontrado no QA foi corrigido.
