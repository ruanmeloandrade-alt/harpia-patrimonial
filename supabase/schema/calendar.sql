-- Calendar workspace and Google Calendar foundation
-- Applied in production as: calendar_workspace_google_foundation_20260924

insert into public.permissions (key, label, module, description)
values
  ('calendar.view', 'Visualizar calendário', 'calendar', 'Visualizar tarefas, reuniões e agenda interna.'),
  ('calendar.manage', 'Gerenciar calendário', 'calendar', 'Criar, editar, concluir e excluir tarefas e reuniões.')
on conflict (key) do update
set label = excluded.label,
    module = excluded.module,
    description = excluded.description;

insert into public.group_permissions (group_id, permission_id, effect)
select g.id, p.id, 'allow'::public.permission_effect
from public.permission_groups g
join public.permissions p on p.key in ('calendar.view','calendar.manage')
where g.slug = 'administrador'
on conflict (group_id, permission_id) do update set effect = excluded.effect;

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'task' check (kind in ('task','meeting')),
  title text not null check (char_length(btrim(title)) > 0),
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  assignee_id uuid references public.internal_assignee_directory(id) on delete set null,
  assignee_label text,
  lead_id text references public.crm_leads(id) on delete set null,
  guest_emails text[] not null default '{}',
  location text,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  source text not null default 'manual' check (source in ('manual','crm','salesbot','google')),
  sync_to_google boolean not null default false,
  google_sync_status text not null default 'not_requested'
    check (google_sync_status in ('not_requested','pending','synced','error','not_connected')),
  google_calendar_id text,
  google_event_id text,
  google_meet_url text,
  google_html_link text,
  google_sync_error text,
  google_sync_requested_at timestamptz,
  created_by uuid references public.user_profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_items_time_check check (end_at > start_at)
);

create index if not exists calendar_items_start_at_idx on public.calendar_items(start_at);
create index if not exists calendar_items_assignee_start_idx on public.calendar_items(assignee_id,start_at);
create index if not exists calendar_items_google_event_idx on public.calendar_items(google_event_id)
  where google_event_id is not null;
create index if not exists calendar_items_lead_idx on public.calendar_items(lead_id)
  where lead_id is not null;
create index if not exists calendar_items_created_by_idx on public.calendar_items(created_by)
  where created_by is not null;

alter table public.calendar_items enable row level security;

drop policy if exists calendar_items_read on public.calendar_items;
create policy calendar_items_read
on public.calendar_items for select to authenticated
using (
  private.user_has_permission((select auth.uid()), 'calendar.view')
  or private.user_has_permission((select auth.uid()), 'calendar.manage')
);

drop policy if exists calendar_items_insert on public.calendar_items;
create policy calendar_items_insert
on public.calendar_items for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'calendar.manage'));

drop policy if exists calendar_items_update on public.calendar_items;
create policy calendar_items_update
on public.calendar_items for update to authenticated
using (private.user_has_permission((select auth.uid()), 'calendar.manage'))
with check (private.user_has_permission((select auth.uid()), 'calendar.manage'));

drop policy if exists calendar_items_delete on public.calendar_items;
create policy calendar_items_delete
on public.calendar_items for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'calendar.manage'));

revoke all on public.calendar_items from anon;
grant select, insert, update, delete on public.calendar_items to authenticated;
grant all on public.calendar_items to service_role;

drop trigger if exists calendar_items_touch_updated_at on public.calendar_items;
create trigger calendar_items_touch_updated_at
before update on public.calendar_items
for each row execute function private.touch_updated_at();

insert into public.integration_connections (provider, status, metadata)
select
  'google_calendar',
  'not_connected',
  '{"capabilities":["events","attendees","meet"],"oauth_ready":false,"calendar_id":"primary"}'::jsonb
where not exists (
  select 1 from public.integration_connections where provider = 'google_calendar'
);

drop policy if exists integration_connections_calendar_read on public.integration_connections;
drop policy if exists integration_connections_read on public.integration_connections;
create policy integration_connections_read
on public.integration_connections for select to authenticated
using (
  private.user_has_permission((select auth.uid()), 'integrations.view')
  or private.user_has_permission((select auth.uid()), 'integrations.manage')
  or (
    provider = 'google_calendar'
    and (
      private.user_has_permission((select auth.uid()), 'calendar.view')
      or private.user_has_permission((select auth.uid()), 'calendar.manage')
    )
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'calendar_items'
  ) then
    alter publication supabase_realtime add table public.calendar_items;
  end if;
end
$$;

-- Follow-up production migration: calendar_assignee_label_20260924
alter table public.calendar_items add column if not exists assignee_label text;

-- Follow-up production migration: calendar_policy_performance_hardening_20260924
-- Consolidates Google Calendar read access into integration_connections_read and indexes created_by.
