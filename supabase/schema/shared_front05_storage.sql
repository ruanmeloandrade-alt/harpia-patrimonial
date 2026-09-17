create table if not exists public.f05_shared_storage (
  storage_key text primary key,
  value jsonb not null default '[]'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.user_profiles(id) on delete set null,
  constraint f05_shared_storage_value_array check (jsonb_typeof(value) = 'array')
);

create index if not exists f05_shared_storage_updated_by_idx
on public.f05_shared_storage(updated_by)
where updated_by is not null;

alter table public.f05_shared_storage enable row level security;

create or replace function private.can_read_f05_storage(p_storage_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_storage_key
    when 'harpia:f05:salesbots' then private.user_has_permission((select auth.uid()), 'salesbot.view') or private.user_has_permission((select auth.uid()), 'salesbot.manage')
    when 'harpia:f05:salesbot-executions' then private.user_has_permission((select auth.uid()), 'salesbot.view') or private.user_has_permission((select auth.uid()), 'salesbot.manage')
    when 'harpia:f05:automations' then private.user_has_permission((select auth.uid()), 'automations.view') or private.user_has_permission((select auth.uid()), 'automations.manage')
    when 'harpia:f05:ai-agents' then private.user_has_permission((select auth.uid()), 'ai.view') or private.user_has_permission((select auth.uid()), 'ai.manage')
    when 'harpia:f05:ai-agent-executions' then private.user_has_permission((select auth.uid()), 'ai.view') or private.user_has_permission((select auth.uid()), 'ai.manage')
    when 'harpia:f05:ai-provider-profiles' then private.user_has_permission((select auth.uid()), 'ai.view') or private.user_has_permission((select auth.uid()), 'ai.manage') or private.user_has_permission((select auth.uid()), 'integrations.view') or private.user_has_permission((select auth.uid()), 'integrations.manage')
    when 'harpia:f05:integrations' then private.user_has_permission((select auth.uid()), 'integrations.view') or private.user_has_permission((select auth.uid()), 'integrations.manage')
    else false
  end;
$$;

create or replace function private.can_write_f05_storage(p_storage_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_storage_key
    when 'harpia:f05:salesbots' then private.user_has_permission((select auth.uid()), 'salesbot.manage')
    when 'harpia:f05:salesbot-executions' then private.user_has_permission((select auth.uid()), 'salesbot.manage')
    when 'harpia:f05:automations' then private.user_has_permission((select auth.uid()), 'automations.manage')
    when 'harpia:f05:ai-agents' then private.user_has_permission((select auth.uid()), 'ai.manage')
    when 'harpia:f05:ai-agent-executions' then private.user_has_permission((select auth.uid()), 'ai.manage')
    when 'harpia:f05:ai-provider-profiles' then private.user_has_permission((select auth.uid()), 'integrations.manage')
    when 'harpia:f05:integrations' then private.user_has_permission((select auth.uid()), 'integrations.manage')
    else false
  end;
$$;

drop policy if exists f05_shared_storage_select on public.f05_shared_storage;
create policy f05_shared_storage_select
on public.f05_shared_storage
for select
to authenticated
using (private.can_read_f05_storage(storage_key));

drop policy if exists f05_shared_storage_update on public.f05_shared_storage;
create policy f05_shared_storage_update
on public.f05_shared_storage
for update
to authenticated
using (private.can_write_f05_storage(storage_key))
with check (private.can_write_f05_storage(storage_key));

revoke all on public.f05_shared_storage from anon, authenticated;
grant select, update on public.f05_shared_storage to authenticated;
grant select on public.f05_shared_storage to service_role;

insert into public.f05_shared_storage(storage_key, value)
values
  ('harpia:f05:salesbots', '[]'::jsonb),
  ('harpia:f05:salesbot-executions', '[]'::jsonb),
  ('harpia:f05:automations', '[]'::jsonb),
  ('harpia:f05:ai-agents', '[]'::jsonb),
  ('harpia:f05:ai-agent-executions', '[]'::jsonb),
  ('harpia:f05:ai-provider-profiles', '[]'::jsonb),
  ('harpia:f05:integrations', '[]'::jsonb)
on conflict (storage_key) do nothing;

create or replace function public.save_f05_shared_storage(
  p_storage_key text,
  p_value jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_revision bigint;
begin
  if not private.can_write_f05_storage(p_storage_key) then
    raise exception 'not authorized to write shared Front05 storage';
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'array' then
    raise exception 'invalid shared Front05 storage value';
  end if;

  update public.f05_shared_storage
  set value = p_value,
      revision = revision + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where storage_key = p_storage_key
    and revision = p_expected_revision
  returning revision into next_revision;

  return next_revision;
end;
$$;

revoke all on function public.save_f05_shared_storage(text, jsonb, bigint) from public, anon;
grant execute on function public.save_f05_shared_storage(text, jsonb, bigint) to authenticated;
