-- Hárpia Patrimonial & Co. — endurecimento de autorização do núcleo
-- Aplicar APÓS supabase/schema/core_auth.sql no projeto dedicado da Hárpia.

-- Um usuário autenticado não pode desativar/rebaixar a própria conta interna.
-- service_role continua autorizado para bootstrap e manutenção controlada.
-- Supabase moderno envia a role dentro de request.jwt.claims e também em current_setting('role');
-- manter compatibilidade com o claim legado request.jwt.claim.role.
create or replace function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := '';
begin
  begin
    jwt_role := coalesce(
      (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'role'),
      ''
    );
  exception when others then
    jwt_role := '';
  end;

  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and jwt_role <> 'service_role'
     and coalesce(current_setting('role', true), '') <> 'service_role' then
    if old.id = (select auth.uid())
       and (
         old.account_type is distinct from new.account_type
         or old.is_active is distinct from new.is_active
       ) then
      raise exception 'cannot change own security status';
    end if;

    if old.account_type is distinct from new.account_type
       or old.is_active is distinct from new.is_active then
      if not private.user_has_permission((select auth.uid()), 'users.manage') then
        raise exception 'not authorized to change security fields';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_security_fields() from public;

-- Associação de grupos altera autoridade efetiva. Exige gestão de usuários + funções
-- e não pode ser usada para editar o próprio acesso.
drop policy if exists "memberships_manage_authorized" on public.user_group_memberships;
create policy "memberships_manage_authorized"
on public.user_group_memberships for all to authenticated
using (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
)
with check (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);

-- Exceções individuais também exigem as duas capacidades e nunca podem ser
-- usadas para conceder/revogar permissões da própria conta.
drop policy if exists "overrides_manage_authorized" on public.user_permission_overrides;
create policy "overrides_manage_authorized"
on public.user_permission_overrides for all to authenticated
using (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
)
with check (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);
