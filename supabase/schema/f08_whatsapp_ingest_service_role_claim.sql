-- Hárpia Patrimonial | F08
-- Corrige a ingestão de leads recebidos pelo WhatsApp para aceitar
-- o claim moderno request.jwt.claims usado pelo service_role no Supabase.

create or replace function public.admin_ingest_public_lead(
  p_name text,
  p_email text default null::text,
  p_whatsapp text default null::text,
  p_origin text default 'site'::text,
  p_action text default null::text,
  p_page text default null::text,
  p_interest jsonb default null::jsonb,
  p_occurred_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  lead_id text;
  history_id text;
  timestamp_value timestamptz;
  timestamp_text text;
  current_state jsonb;
  lead jsonb;
  history_entry jsonb;
  legacy_role text;
  claims_role text;
begin
  legacy_role := nullif(current_setting('request.jwt.claim.role', true), '');
  claims_role := nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '');

  if coalesce(legacy_role, '') <> 'service_role'
     and coalesce(claims_role, '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if nullif(btrim(p_name), '') is null then raise exception 'name required'; end if;
  if length(p_name) > 180 then raise exception 'name too long'; end if;
  if p_email is not null and length(p_email) > 320 then raise exception 'email too long'; end if;
  if p_whatsapp is not null and length(p_whatsapp) > 40 then raise exception 'whatsapp too long'; end if;

  lead_id := 'lead_' || gen_random_uuid()::text;
  history_id := 'history_' || gen_random_uuid()::text;
  timestamp_value := coalesce(p_occurred_at, now());
  timestamp_text := timestamp_value::text;

  insert into public.crm_leads (
    id, name, email, whatsapp, source, source_action, source_page, source_occurred_at,
    source_metadata, interest_type, interest_reference_id, interest_label,
    created_at, updated_at
  ) values (
    lead_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_email,'')), ''),
    nullif(btrim(coalesce(p_whatsapp,'')), ''),
    nullif(btrim(coalesce(p_origin,'')), ''),
    nullif(btrim(coalesce(p_action,'')), ''),
    nullif(btrim(coalesce(p_page,'')), ''),
    timestamp_value,
    coalesce(p_metadata, '{}'::jsonb),
    nullif(p_interest->>'type',''),
    nullif(p_interest->>'referenceId',''),
    nullif(p_interest->>'label',''),
    timestamp_value,
    timestamp_value
  );

  insert into public.crm_history (id, lead_id, type, description, metadata, created_at)
  values (
    history_id,
    lead_id,
    'lead_created',
    'Lead criado no CRM.',
    jsonb_strip_nulls(jsonb_build_object(
      'source', p_origin,
      'sourceAction', p_action,
      'sourcePage', p_page,
      'sourceOccurredAt', timestamp_text,
      'sourceMetadata', coalesce(p_metadata, '{}'::jsonb)
    )),
    timestamp_value
  );

  select state into current_state
  from public.platform_module_state
  where module = 'crm'
  for update;

  if current_state is null then
    current_state := '{"version":1,"pipelines":[],"stages":[],"leads":[],"tags":[],"customFieldDefinitions":[],"tasks":[],"history":[]}'::jsonb;
  end if;

  lead := jsonb_strip_nulls(jsonb_build_object(
    'id', lead_id,
    'name', btrim(p_name),
    'email', nullif(btrim(coalesce(p_email,'')), ''),
    'whatsapp', nullif(btrim(coalesce(p_whatsapp,'')), ''),
    'source', nullif(btrim(coalesce(p_origin,'')), ''),
    'sourceAction', nullif(btrim(coalesce(p_action,'')), ''),
    'sourcePage', nullif(btrim(coalesce(p_page,'')), ''),
    'sourceOccurredAt', timestamp_text,
    'sourceMetadata', coalesce(p_metadata, '{}'::jsonb),
    'interest', p_interest,
    'tagIds', '[]'::jsonb,
    'customFields', '{}'::jsonb,
    'createdAt', timestamp_text,
    'updatedAt', timestamp_text
  ));

  history_entry := jsonb_build_object(
    'id', history_id,
    'leadId', lead_id,
    'type', 'lead_created',
    'description', 'Lead criado no CRM.',
    'metadata', jsonb_strip_nulls(jsonb_build_object(
      'source', p_origin,
      'sourceAction', p_action,
      'sourcePage', p_page,
      'sourceOccurredAt', timestamp_text,
      'sourceMetadata', coalesce(p_metadata, '{}'::jsonb)
    )),
    'createdAt', timestamp_text
  );

  current_state := jsonb_set(current_state, '{leads}', coalesce(current_state->'leads','[]'::jsonb) || jsonb_build_array(lead), true);
  current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);

  update public.platform_module_state
  set state = current_state,
      revision = revision + 1,
      updated_at = now(),
      updated_by = null
  where module = 'crm';

  return lead_id;
end;
$$;

revoke all on function public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb)
  to service_role;
