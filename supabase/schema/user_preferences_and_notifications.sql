-- Configurações por usuário e notificações em tempo real
-- Aplicado no Supabase em 24/09/2026.

create table if not exists public.user_preferences (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  compact_mode boolean not null default false,
  popup_notifications boolean not null default true,
  sound_notifications boolean not null default true,
  browser_notifications boolean not null default false,
  notify_new_lead boolean not null default true,
  notify_new_message boolean not null default true,
  notify_task_due boolean not null default true,
  notify_automation_failure boolean not null default true,
  notify_integration_failure boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own
on public.user_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own
on public.user_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own
on public.user_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_preferences to authenticated;
revoke all on public.user_preferences from anon;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  kind text not null check (kind in ('new_lead','new_message','task_due','automation_failure','integration_failure','system')),
  title text not null,
  body text not null default '',
  href text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_unread_idx
  on public.user_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own
on public.user_notifications for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists user_notifications_delete_own on public.user_notifications;
create policy user_notifications_delete_own
on public.user_notifications for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, update, delete on public.user_notifications to authenticated;
revoke all on public.user_notifications from anon;
revoke insert on public.user_notifications from authenticated;

create or replace function private.ensure_internal_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.account_type = 'internal' then
    insert into public.user_preferences(user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_ensure_preferences on public.user_profiles;
create trigger user_profiles_ensure_preferences
after insert or update of account_type on public.user_profiles
for each row execute function private.ensure_internal_user_preferences();

revoke all on function private.ensure_internal_user_preferences() from public, anon, authenticated;

create or replace function private.notify_internal_users(
  p_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_permission text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.user_notifications(user_id, kind, title, body, href, payload)
  select
    profile.id,
    p_kind,
    p_title,
    p_body,
    p_href,
    coalesce(p_payload, '{}'::jsonb)
  from public.user_profiles profile
  left join public.user_preferences pref on pref.user_id = profile.id
  where profile.account_type = 'internal'
    and profile.is_active = true
    and (p_permission is null or private.user_has_permission(profile.id, p_permission))
    and case p_kind
      when 'new_lead' then coalesce(pref.notify_new_lead, true)
      when 'new_message' then coalesce(pref.notify_new_message, true)
      when 'task_due' then coalesce(pref.notify_task_due, true)
      when 'automation_failure' then coalesce(pref.notify_automation_failure, true)
      when 'integration_failure' then coalesce(pref.notify_integration_failure, true)
      else true
    end;
end;
$$;

revoke all on function private.notify_internal_users(text,text,text,text,text,jsonb) from public, anon, authenticated;

create or replace function private.notify_crm_lead_insert()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.notify_internal_users(
    'new_lead','Novo lead',
    coalesce(nullif(new.name,''), 'Novo contato recebido'),
    '/interno/crm','crm.view',
    jsonb_build_object('lead_id', new.id, 'source', new.source)
  );
  return new;
end;
$$;

drop trigger if exists crm_leads_notify_insert on public.crm_leads;
create trigger crm_leads_notify_insert
after insert on public.crm_leads
for each row execute function private.notify_crm_lead_insert();

create or replace function private.notify_inbox_message_insert()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.direction = 'inbound' then
    perform private.notify_internal_users(
      'new_message','Nova mensagem',
      coalesce(nullif(left(new.text_content, 140),''), 'Nova mensagem recebida no Inbox'),
      '/interno/inbox','inbox.view',
      jsonb_build_object('message_id', new.id, 'conversation_id', new.conversation_id, 'provider', new.provider)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists inbox_messages_notify_insert on public.inbox_messages;
create trigger inbox_messages_notify_insert
after insert on public.inbox_messages
for each row execute function private.notify_inbox_message_insert();

create or replace function private.notify_integration_event_failure()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.success = false then
    perform private.notify_internal_users(
      'integration_failure','Falha em integração',
      coalesce(nullif(new.error_message,''), coalesce(new.provider,'Integração') || ' apresentou uma falha.'),
      '/interno/configuracoes','integrations.view',
      jsonb_build_object('event_id', new.id, 'provider', new.provider, 'error_code', new.error_code)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists integration_events_notify_failure on public.integration_events;
create trigger integration_events_notify_failure
after insert on public.integration_events
for each row execute function private.notify_integration_event_failure();

create or replace function private.notify_automation_action_failure()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.status in ('failed','error')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform private.notify_internal_users(
      'automation_failure','Falha em automação',
      'Uma ação automática falhou e precisa de revisão.',
      '/interno/execucoes','automations.view',
      jsonb_build_object('automation_id', new.automation_id, 'action_id', new.action_id, 'action_type', new.action_type, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists automation_action_runs_notify_failure on public.automation_action_runs;
create trigger automation_action_runs_notify_failure
after insert or update of status on public.automation_action_runs
for each row execute function private.notify_automation_action_failure();

revoke all on function private.notify_crm_lead_insert() from public, anon, authenticated;
revoke all on function private.notify_inbox_message_insert() from public, anon, authenticated;
revoke all on function private.notify_integration_event_failure() from public, anon, authenticated;
revoke all on function private.notify_automation_action_failure() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;
