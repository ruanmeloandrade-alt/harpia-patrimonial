-- Hárpia Patrimonial — estado compartilhado CRM/Inbox para o MVP.
-- Substitui persistência operacional em localStorage na composição integrada.

create table if not exists public.platform_module_state (
  module text primary key check (module in ('crm','inbox')),
  state jsonb not null,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null
);

insert into public.platform_module_state(module, state) values
('crm', '{"version":1,"pipelines":[],"stages":[],"leads":[],"tags":[],"customFieldDefinitions":[],"tasks":[],"history":[]}'::jsonb),
('inbox', '{"version":1,"conversations":[],"messages":[]}'::jsonb)
on conflict (module) do nothing;

alter table public.platform_module_state enable row level security;

create or replace function private.can_read_platform_module(p_module text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_module
    when 'crm' then private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage')
    when 'inbox' then private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage')
    else false end;
$$;

create or replace function private.can_write_platform_module(p_module text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_module
    when 'crm' then private.user_has_permission((select auth.uid()), 'crm.manage')
    when 'inbox' then private.user_has_permission((select auth.uid()), 'inbox.manage')
    else false end;
$$;

revoke all on function private.can_read_platform_module(text) from public;
revoke all on function private.can_write_platform_module(text) from public;
grant execute on function private.can_read_platform_module(text) to authenticated;
grant execute on function private.can_write_platform_module(text) to authenticated;

create policy "platform_module_state_read" on public.platform_module_state for select to authenticated using (private.can_read_platform_module(module));
create policy "platform_module_state_update" on public.platform_module_state for update to authenticated using (private.can_write_platform_module(module)) with check (private.can_write_platform_module(module));
grant select, update on public.platform_module_state to authenticated;
grant select, insert, update, delete on public.platform_module_state to service_role;

create or replace function public.admin_ingest_public_lead(
  p_name text,
  p_email text default null,
  p_whatsapp text default null,
  p_origin text default 'site',
  p_action text default null,
  p_page text default null,
  p_interest jsonb default null,
  p_occurred_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  lead_id text;
  history_id text;
  timestamp_text text;
  current_state jsonb;
  lead jsonb;
  history_entry jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'name required'; end if;
  if length(p_name) > 180 then raise exception 'name too long'; end if;
  if p_email is not null and length(p_email) > 320 then raise exception 'email too long'; end if;
  if p_whatsapp is not null and length(p_whatsapp) > 40 then raise exception 'whatsapp too long'; end if;

  lead_id := 'lead_' || gen_random_uuid()::text;
  history_id := 'history_' || gen_random_uuid()::text;
  timestamp_text := coalesce(p_occurred_at, now())::text;
  select state into current_state from public.platform_module_state where module = 'crm' for update;
  if current_state is null then current_state := '{"version":1,"pipelines":[],"stages":[],"leads":[],"tags":[],"customFieldDefinitions":[],"tasks":[],"history":[]}'::jsonb; end if;

  lead := jsonb_strip_nulls(jsonb_build_object(
    'id', lead_id, 'name', btrim(p_name), 'email', nullif(btrim(coalesce(p_email,'')), ''), 'whatsapp', nullif(btrim(coalesce(p_whatsapp,'')), ''),
    'source', nullif(btrim(coalesce(p_origin,'')), ''), 'sourceAction', nullif(btrim(coalesce(p_action,'')), ''), 'sourcePage', nullif(btrim(coalesce(p_page,'')), ''),
    'sourceOccurredAt', timestamp_text, 'sourceMetadata', coalesce(p_metadata, '{}'::jsonb), 'interest', p_interest,
    'tagIds', '[]'::jsonb, 'customFields', '{}'::jsonb, 'createdAt', timestamp_text, 'updatedAt', timestamp_text
  ));
  history_entry := jsonb_build_object(
    'id', history_id, 'leadId', lead_id, 'type', 'lead_created', 'description', 'Lead criado no CRM.',
    'metadata', jsonb_strip_nulls(jsonb_build_object('source', p_origin, 'sourceAction', p_action, 'sourcePage', p_page, 'sourceOccurredAt', timestamp_text, 'sourceMetadata', coalesce(p_metadata, '{}'::jsonb))),
    'createdAt', timestamp_text
  );
  current_state := jsonb_set(current_state, '{leads}', coalesce(current_state->'leads','[]'::jsonb) || jsonb_build_array(lead), true);
  current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);
  update public.platform_module_state set state = current_state, revision = revision + 1, updated_at = now(), updated_by = null where module = 'crm';
  return lead_id;
end;
$$;
revoke all on function public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb) to service_role;

create or replace function public.list_internal_assignees()
returns table(id uuid, full_name text)
language sql stable security definer set search_path = '' as $$
  select up.id, up.full_name from public.user_profiles up
  where up.account_type = 'internal' and up.is_active = true and nullif(btrim(up.full_name), '') is not null
    and (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'))
  order by up.full_name;
$$;
revoke all on function public.list_internal_assignees() from public, anon;
grant execute on function public.list_internal_assignees() to authenticated;
