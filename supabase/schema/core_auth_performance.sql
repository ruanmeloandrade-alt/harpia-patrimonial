-- Hárpia Patrimonial & Co. — otimizações apontadas pelo Supabase Advisor
-- Aplicar após core_auth.sql e core_auth_hardening.sql.

create index if not exists idx_group_permissions_permission_id
  on public.group_permissions(permission_id);
create index if not exists idx_user_group_memberships_group_id
  on public.user_group_memberships(group_id);
create index if not exists idx_user_permission_overrides_permission_id
  on public.user_permission_overrides(permission_id);

-- Evita políticas permissivas duplicadas em SELECT: leitura permanece nas policies
-- específicas, enquanto gestão fica separada por INSERT/UPDATE/DELETE.

drop policy if exists "groups_manage_authorized" on public.permission_groups;
create policy "groups_insert_authorized"
on public.permission_groups for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));
create policy "groups_update_authorized"
on public.permission_groups for update to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'))
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));
create policy "groups_delete_authorized"
on public.permission_groups for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'));

drop policy if exists "group_permissions_manage_authorized" on public.group_permissions;
create policy "group_permissions_insert_authorized"
on public.group_permissions for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));
create policy "group_permissions_update_authorized"
on public.group_permissions for update to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'))
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));
create policy "group_permissions_delete_authorized"
on public.group_permissions for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'));

drop policy if exists "memberships_manage_authorized" on public.user_group_memberships;
create policy "memberships_insert_authorized"
on public.user_group_memberships for insert to authenticated
with check (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);
create policy "memberships_update_authorized"
on public.user_group_memberships for update to authenticated
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
create policy "memberships_delete_authorized"
on public.user_group_memberships for delete to authenticated
using (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);

drop policy if exists "overrides_manage_authorized" on public.user_permission_overrides;
create policy "overrides_insert_authorized"
on public.user_permission_overrides for insert to authenticated
with check (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);
create policy "overrides_update_authorized"
on public.user_permission_overrides for update to authenticated
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
create policy "overrides_delete_authorized"
on public.user_permission_overrides for delete to authenticated
using (
  user_id <> (select auth.uid())
  and private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);

drop policy if exists "organization_settings_manage_authorized" on public.organization_settings;
create policy "organization_settings_insert_authorized"
on public.organization_settings for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'settings.manage'));
create policy "organization_settings_update_authorized"
on public.organization_settings for update to authenticated
using (private.user_has_permission((select auth.uid()), 'settings.manage'))
with check (private.user_has_permission((select auth.uid()), 'settings.manage'));
create policy "organization_settings_delete_authorized"
on public.organization_settings for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'settings.manage'));
