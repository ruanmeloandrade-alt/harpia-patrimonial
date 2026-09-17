-- Hárpia Patrimonial — diretório mínimo de responsáveis para CRM/Inbox.
-- Evita expor user_profiles inteiro para usuários operacionais.

create table if not exists public.internal_assignee_directory (
  id uuid primary key references public.user_profiles(id) on delete cascade,
  full_name text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.internal_assignee_directory enable row level security;

insert into public.internal_assignee_directory(id, full_name, is_active, updated_at)
select id, full_name, is_active, now()
from public.user_profiles
where account_type = 'internal'
  and nullif(btrim(full_name), '') is not null
on conflict (id) do update
set full_name = excluded.full_name,
    is_active = excluded.is_active,
    updated_at = now();

delete from public.internal_assignee_directory d
where not exists (
  select 1 from public.user_profiles p
  where p.id = d.id and p.account_type = 'internal'
);

create or replace function private.sync_internal_assignee_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_type = 'internal' and nullif(btrim(new.full_name), '') is not null then
    insert into public.internal_assignee_directory(id, full_name, is_active, updated_at)
    values (new.id, new.full_name, new.is_active, now())
    on conflict (id) do update
    set full_name = excluded.full_name,
        is_active = excluded.is_active,
        updated_at = now();
  else
    delete from public.internal_assignee_directory where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_internal_assignee_directory() from public, anon, authenticated;

drop trigger if exists sync_internal_assignee_directory on public.user_profiles;
create trigger sync_internal_assignee_directory
after insert or update of full_name, account_type, is_active
on public.user_profiles
for each row execute function private.sync_internal_assignee_directory();

drop policy if exists internal_assignee_directory_read on public.internal_assignee_directory;
create policy internal_assignee_directory_read
on public.internal_assignee_directory
for select
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'crm.view')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
  or private.user_has_permission((select auth.uid()), 'inbox.view')
  or private.user_has_permission((select auth.uid()), 'inbox.manage')
);

revoke all on public.internal_assignee_directory from anon, authenticated;
grant select on public.internal_assignee_directory to authenticated;

create or replace function public.list_internal_assignees()
returns table(id uuid, full_name text)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.id, d.full_name
  from public.internal_assignee_directory d
  where d.is_active = true
  order by d.full_name;
$$;

revoke all on function public.list_internal_assignees() from public, anon;
grant execute on function public.list_internal_assignees() to authenticated;
