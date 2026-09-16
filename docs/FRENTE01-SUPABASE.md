# Frente01 — Supabase dedicado da Hárpia

## Regra absoluta

A Hárpia deve usar projeto Supabase próprio. **Não usar o projeto MKTon**.

## O que já está preparado no código

- Cliente frontend: `src/core/supabase/client.ts`
- Variáveis esperadas: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- Schema: `supabase/schema/core_auth.sql`
- Edge Function administrativa: `supabase/functions/admin-user/index.ts`
- JWT obrigatório: `supabase/functions/admin-user/config.toml`

## Ordem para ativação

1. Criar projeto Supabase dedicado da Hárpia.
2. Aplicar `supabase/schema/core_auth.sql` no projeto dedicado.
3. Rodar advisors de segurança e performance e corrigir alertas relevantes.
4. Publicar a Edge Function `admin-user` com verificação de JWT habilitada.
5. Obter URL e chave publishable do projeto.
6. Configurar as variáveis no ambiente de deploy, nunca commitar segredos.
7. Criar a primeira conta administrativa e vinculá-la ao grupo de sistema `Administrador`.
8. Testar cadastro de cliente, login, recuperação, sessão persistente, rotas internas e RLS.

## Bootstrap do primeiro administrador

Não existe credencial administrativa hardcoded no repositório. O primeiro administrador deve ser promovido conscientemente após a criação do projeto dedicado.

Fluxo recomendado:

1. Criar uma conta normal pelo cadastro ou Auth.
2. Com acesso administrativo ao banco, alterar `public.user_profiles.account_type` para `internal`.
3. Associar o `user_id` ao grupo cujo `slug = 'administrador'` em `public.user_group_memberships`.
4. A partir daí, a própria plataforma pode cadastrar e administrar os demais usuários.

## Segurança implementada

- RLS habilitado em todas as tabelas públicas deste núcleo.
- Autorização usa perfil e tabelas de permissão, não `user_metadata`.
- Cliente final criado pelo gatilho sempre nasce como `client`, independentemente do metadata enviado pelo navegador.
- Grupo + exceção individual (`allow`/`deny`). Negação individual prevalece.
- Alteração de `account_type` e `is_active` protegida por trigger.
- Grupo `Administrador` é estrutural e não pode ser desativado/excluído pela UI.
- `service_role` fica somente no ambiente server-side da Edge Function.
- Criação de usuário interno exige `users.manage`; atribuição de grupo também exige `roles.manage`.

## Integração com outras frentes

Outras frentes devem consumir a identidade via `useAuth()` e as guardas `ClientRoute` / `InternalRoute`. Não devem criar outro sistema de login ou outra tabela de usuário.
