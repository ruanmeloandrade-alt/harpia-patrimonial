-- Hárpia Patrimonial & Co. — núcleo de autenticação, usuários e permissões
-- Aplicar somente no projeto Supabase dedicado da Hárpia.
-- NÃO aplicar no projeto MKTon.

create schema if not exists private;

create type public.account_type as enum ('client', 'internal');
create type public.permission_effect as enum ('allow', 'deny');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  whatsapp text,
  account_type public.account_type not null default 'client',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  module text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permission_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_permissions (
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect public.permission_effect not null default 'allow',
  created_at timestamptz not null default now(),
  primary key (group_id, permission_id)
);

create table public.user_group_memberships (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create table public.user_permission_overrides (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect public.permission_effect not null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

create table public.organization_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'Hárpia Patrimonial & Co.',
  legal_name text,
  document text,
  phone text,
  email text,
  website text not null default 'harpiapatrimonial.com',
  city text,
  state text,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.organization_settings (id) values (1) on conflict (id) do nothing;

create or replace function private.is_internal_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and p_user_id = (select auth.uid())
    and exists (
      select 1 from public.user_profiles up
      where up.id = p_user_id
        and up.account_type = 'internal'
        and up.is_active = true
    );
$$;

create or replace function private.user_has_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and p_user_id = (select auth.uid())
    and exists (
      select 1 from public.user_profiles up
      where up.id = p_user_id
        and up.account_type = 'internal'
        and up.is_active = true
    )
    and not exists (
      select 1
      from public.user_permission_overrides uo
      join public.permissions p on p.id = uo.permission_id
      where uo.user_id = p_user_id
        and p.key = p_permission_key
        and uo.effect = 'deny'
    )
    and (
      exists (
        select 1
        from public.user_permission_overrides uo
        join public.permissions p on p.id = uo.permission_id
        where uo.user_id = p_user_id
          and p.key = p_permission_key
          and uo.effect = 'allow'
      )
      or exists (
        select 1
        from public.user_group_memberships ug
        join public.group_permissions gp on gp.group_id = ug.group_id and gp.effect = 'allow'
        join public.permissions p on p.id = gp.permission_id
        join public.permission_groups g on g.id = ug.group_id and g.is_active = true
        where ug.user_id = p_user_id
          and p.key = p_permission_key
      )
    );
$$;

revoke all on function private.is_internal_user(uuid) from public;
revoke all on function private.user_has_permission(uuid, text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_internal_user(uuid) to authenticated;
grant execute on function private.user_has_permission(uuid, text) to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_touch_updated_at before update on public.user_profiles
for each row execute function private.touch_updated_at();
create trigger permission_groups_touch_updated_at before update on public.permission_groups
for each row execute function private.touch_updated_at();
create trigger organization_settings_touch_updated_at before update on public.organization_settings
for each row execute function private.touch_updated_at();

create or replace function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.account_type is distinct from new.account_type or old.is_active is distinct from new.is_active then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       and not private.user_has_permission((select auth.uid()), 'users.manage') then
      raise exception 'not authorized to change security fields';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_profile_security_fields() from public;
create trigger protect_profile_security_fields before update on public.user_profiles
for each row execute function private.protect_profile_security_fields();

create or replace function private.protect_system_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_system = true then
    if tg_op = 'DELETE' then
      raise exception 'system group cannot be deleted';
    end if;
    if new.is_system is distinct from old.is_system
       or new.slug is distinct from old.slug
       or new.is_active is distinct from old.is_active then
      raise exception 'system group security fields cannot be changed';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_system_group() from public;
create trigger protect_system_group before update or delete on public.permission_groups
for each row execute function private.protect_system_group();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, full_name, whatsapp, account_type, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'whatsapp', ''),
    'client',
    true
  );
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

alter table public.user_profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.permission_groups enable row level security;
alter table public.group_permissions enable row level security;
alter table public.user_group_memberships enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.organization_settings enable row level security;

create policy "profile_select_own_or_manager"
on public.user_profiles for select to authenticated
using (id = (select auth.uid()) or private.user_has_permission((select auth.uid()), 'users.view'));

create policy "profile_update_own_or_manager"
on public.user_profiles for update to authenticated
using (id = (select auth.uid()) or private.user_has_permission((select auth.uid()), 'users.manage'))
with check (id = (select auth.uid()) or private.user_has_permission((select auth.uid()), 'users.manage'));

create policy "permissions_select_internal"
on public.permissions for select to authenticated
using (private.is_internal_user((select auth.uid())));

create policy "groups_select_internal"
on public.permission_groups for select to authenticated
using (private.is_internal_user((select auth.uid())));

create policy "groups_manage_authorized"
on public.permission_groups for all to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'))
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));

create policy "group_permissions_select_internal"
on public.group_permissions for select to authenticated
using (private.is_internal_user((select auth.uid())));

create policy "group_permissions_manage_authorized"
on public.group_permissions for all to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'))
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));

create policy "memberships_select_own_or_manager"
on public.user_group_memberships for select to authenticated
using (user_id = (select auth.uid()) or private.user_has_permission((select auth.uid()), 'users.view'));

create policy "memberships_manage_authorized"
on public.user_group_memberships for all to authenticated
using (
  private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
)
with check (
  private.user_has_permission((select auth.uid()), 'users.manage')
  and private.user_has_permission((select auth.uid()), 'roles.manage')
);

create policy "overrides_select_own_or_manager"
on public.user_permission_overrides for select to authenticated
using (user_id = (select auth.uid()) or private.user_has_permission((select auth.uid()), 'users.view'));

create policy "overrides_manage_authorized"
on public.user_permission_overrides for all to authenticated
using (private.user_has_permission((select auth.uid()), 'roles.manage'))
with check (private.user_has_permission((select auth.uid()), 'roles.manage'));

create policy "organization_settings_select_internal"
on public.organization_settings for select to authenticated
using (private.is_internal_user((select auth.uid())));

create policy "organization_settings_manage_authorized"
on public.organization_settings for all to authenticated
using (private.user_has_permission((select auth.uid()), 'settings.manage'))
with check (private.user_has_permission((select auth.uid()), 'settings.manage'));

create or replace view public.current_user_permissions
with (security_invoker = true)
as
with group_allow as (
  select p.key as permission_key
  from public.user_group_memberships ug
  join public.permission_groups g on g.id = ug.group_id and g.is_active = true
  join public.group_permissions gp on gp.group_id = ug.group_id and gp.effect = 'allow'
  join public.permissions p on p.id = gp.permission_id
  where ug.user_id = (select auth.uid())
), direct_allow as (
  select p.key as permission_key
  from public.user_permission_overrides uo
  join public.permissions p on p.id = uo.permission_id
  where uo.user_id = (select auth.uid()) and uo.effect = 'allow'
), direct_deny as (
  select p.key as permission_key
  from public.user_permission_overrides uo
  join public.permissions p on p.id = uo.permission_id
  where uo.user_id = (select auth.uid()) and uo.effect = 'deny'
)
select permission_key from (
  select permission_key from group_allow
  union
  select permission_key from direct_allow
) allowed
where not exists (select 1 from direct_deny denied where denied.permission_key = allowed.permission_key);

grant select on public.current_user_permissions to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select on public.permissions to authenticated;
grant select, insert, update, delete on public.permission_groups to authenticated;
grant select, insert, update, delete on public.group_permissions to authenticated;
grant select, insert, update, delete on public.user_group_memberships to authenticated;
grant select, insert, update, delete on public.user_permission_overrides to authenticated;
grant select, update on public.organization_settings to authenticated;

-- Novos projetos Supabase podem não expor tabelas criadas por SQL automaticamente.
-- Grants explícitos mantêm a Data API funcional sem depender dessa configuração do projeto.
grant select on public.current_user_permissions to service_role;
grant select, insert, update, delete on public.user_profiles to service_role;
grant select, insert, update, delete on public.permissions to service_role;
grant select, insert, update, delete on public.permission_groups to service_role;
grant select, insert, update, delete on public.group_permissions to service_role;
grant select, insert, update, delete on public.user_group_memberships to service_role;
grant select, insert, update, delete on public.user_permission_overrides to service_role;
grant select, insert, update, delete on public.organization_settings to service_role;

insert into public.permissions (key, label, module, description) values
  ('dashboard.view', 'Visualizar dashboard', 'Dashboard', null),
  ('users.view', 'Visualizar usuários', 'Usuários', null),
  ('users.manage', 'Gerenciar usuários', 'Usuários', null),
  ('roles.view', 'Visualizar funções e permissões', 'Permissões', null),
  ('roles.manage', 'Gerenciar funções e permissões', 'Permissões', null),
  ('settings.view', 'Visualizar configurações', 'Configurações', null),
  ('settings.manage', 'Gerenciar configurações', 'Configurações', null),
  ('catalog.view', 'Visualizar catálogo interno', 'Catálogo', null),
  ('catalog.manage', 'Gerenciar catálogo', 'Catálogo', null),
  ('catalog.publish', 'Publicar e pausar imóveis', 'Catálogo', null),
  ('crm.view', 'Visualizar CRM', 'CRM', null),
  ('crm.manage', 'Gerenciar CRM', 'CRM', null),
  ('inbox.view', 'Visualizar Inbox', 'Inbox', null),
  ('inbox.manage', 'Operar Inbox', 'Inbox', null),
  ('automations.view', 'Visualizar automações', 'Automações', null),
  ('automations.manage', 'Gerenciar automações', 'Automações', null),
  ('salesbot.view', 'Visualizar SalesBots', 'SalesBot', null),
  ('salesbot.manage', 'Gerenciar SalesBots', 'SalesBot', null),
  ('ai.view', 'Visualizar agentes de IA', 'IA', null),
  ('ai.manage', 'Gerenciar agentes de IA', 'IA', null),
  ('integrations.view', 'Visualizar integrações', 'Integrações', null),
  ('integrations.manage', 'Gerenciar integrações', 'Integrações', null)
on conflict (key) do update set label = excluded.label, module = excluded.module, description = excluded.description;

insert into public.permission_groups (name, slug, description, is_active, is_system)
values ('Administrador', 'administrador', 'Acesso administrativo completo à plataforma.', true, true)
on conflict (slug) do nothing;

insert into public.group_permissions (group_id, permission_id, effect)
select g.id, p.id, 'allow'::public.permission_effect
from public.permission_groups g cross join public.permissions p
where g.slug = 'administrador'
on conflict (group_id, permission_id) do update set effect = excluded.effect;
