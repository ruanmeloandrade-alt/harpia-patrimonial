create table if not exists public.automation_event_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  lead_id text,
  conversation_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists automation_event_outbox_pending_idx
  on public.automation_event_outbox(status, available_at, created_at)
  where status in ('pending','failed');

alter table public.automation_event_outbox enable row level security;
revoke all on public.automation_event_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.automation_event_outbox to service_role;

create or replace function public.admin_claim_automation_events(p_limit integer default 10)
returns setof public.automation_event_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  return query
  with picked as (
    select o.id
    from public.automation_event_outbox o
    where o.status in ('pending','failed')
      and o.available_at <= now()
    order by o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10), 50))
  )
  update public.automation_event_outbox o
     set status='processing', attempts=o.attempts+1, last_error=null
    from picked
   where o.id=picked.id
  returning o.*;
end;
$$;

create or replace function public.admin_finish_automation_event(
  p_id uuid,
  p_success boolean,
  p_error text default null,
  p_retry_after_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  update public.automation_event_outbox
     set status = case when p_success then 'processed' else 'failed' end,
         processed_at = case when p_success then now() else null end,
         last_error = case when p_success then null else left(coalesce(p_error,'Falha não especificada'), 2000) end,
         available_at = case when p_success then available_at else now() + make_interval(secs => greatest(5, least(coalesce(p_retry_after_seconds,60), 86400))) end
   where id = p_id;
end;
$$;

revoke all on function public.admin_claim_automation_events(integer) from public, anon, authenticated;
revoke all on function public.admin_finish_automation_event(uuid,boolean,text,integer) from public, anon, authenticated;
grant execute on function public.admin_claim_automation_events(integer) to service_role;
grant execute on function public.admin_finish_automation_event(uuid,boolean,text,integer) to service_role;

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
  event_payload jsonb;
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

  event_payload := jsonb_strip_nulls(jsonb_build_object(
    'lead', lead,
    'source', p_origin,
    'sourceAction', p_action,
    'sourcePage', p_page,
    'interest', p_interest,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  ));
  insert into public.automation_event_outbox(event_type, lead_id, payload)
  values ('lead.created', lead_id, event_payload);

  return lead_id;
end;
$$;

revoke all on function public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb) to service_role;
