-- Hárpia Patrimonial | F09 Meta Lead Ads
-- Persistência server-side para conexão Meta, token de Página no Vault,
-- deduplicação de leadgen e ingestão idempotente no CRM.

create table if not exists private.meta_page_token_refs (
  page_id text primary key,
  connection_id uuid not null unique references public.integration_connections(id),
  secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_lead_receipts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.integration_connections(id) on delete set null,
  leadgen_id text not null unique,
  page_id text not null,
  form_id text,
  ad_id text,
  adset_id text,
  campaign_id text,
  created_time timestamptz,
  field_data jsonb not null default '[]'::jsonb,
  raw_lead jsonb not null default '{}'::jsonb,
  crm_lead_id text,
  status text not null default 'received'
    check (status in ('received','ingested','ignored','invalid','error')),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists meta_lead_receipts_connection_idx
  on public.meta_lead_receipts(connection_id);

create index if not exists meta_lead_receipts_page_received_idx
  on public.meta_lead_receipts(page_id, received_at desc);

create index if not exists meta_lead_receipts_status_received_idx
  on public.meta_lead_receipts(status, received_at desc);

alter table public.meta_lead_receipts enable row level security;

drop policy if exists "meta_lead_receipts_read" on public.meta_lead_receipts;
create policy "meta_lead_receipts_read"
  on public.meta_lead_receipts
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'integrations.view')
    or private.user_has_permission((select auth.uid()), 'integrations.manage')
  );

revoke all on public.meta_lead_receipts from public, anon, authenticated;
grant select on public.meta_lead_receipts to authenticated;
grant select, insert, update, delete on public.meta_lead_receipts to service_role;

revoke all on table private.meta_page_token_refs from public, anon, authenticated;
grant select, insert, update, delete on table private.meta_page_token_refs to service_role;

create or replace function public.admin_store_meta_page_token(
  p_page_id text,
  p_page_name text,
  p_page_access_token text,
  p_form_ids text[] default '{}'::text[],
  p_graph_version text default 'v26.0'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  connection_uuid uuid;
  existing_secret_id uuid;
  stored_secret_id uuid;
  safe_graph_version text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if nullif(btrim(p_page_id), '') is null then raise exception 'page_id required'; end if;
  if nullif(btrim(p_page_access_token), '') is null then raise exception 'page_access_token required'; end if;

  safe_graph_version := coalesce(nullif(btrim(p_graph_version), ''), 'v26.0');

  select c.id into connection_uuid
  from public.integration_connections c
  where c.provider = 'meta' and c.external_account_id = btrim(p_page_id)
  order by c.updated_at desc
  limit 1
  for update;

  if connection_uuid is null then
    insert into public.integration_connections(
      provider, status, external_account_id, account_label,
      connected_at, last_health_at, metadata, revision
    )
    values (
      'meta', 'connected', btrim(p_page_id), nullif(btrim(coalesce(p_page_name,'')), ''),
      now(), now(),
      jsonb_build_object(
        'form_ids', to_jsonb(coalesce(p_form_ids, '{}'::text[])),
        'graph_version', safe_graph_version
      ),
      1
    )
    returning id into connection_uuid;
  else
    update public.integration_connections
    set status = 'connected',
        account_label = coalesce(nullif(btrim(coalesce(p_page_name,'')), ''), account_label),
        connected_at = coalesce(connected_at, now()),
        last_health_at = now(),
        last_error_at = null,
        last_error_code = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'form_ids', to_jsonb(coalesce(p_form_ids, '{}'::text[])),
          'graph_version', safe_graph_version
        ),
        revision = revision + 1,
        updated_at = now()
    where id = connection_uuid;
  end if;

  select r.secret_id into existing_secret_id
  from private.meta_page_token_refs r
  where r.page_id = btrim(p_page_id);

  if existing_secret_id is not null then
    perform vault.update_secret(
      existing_secret_id,
      p_page_access_token,
      'harpia_meta_page_' || btrim(p_page_id),
      'Harpia Meta Page access token',
      null
    );
    stored_secret_id := existing_secret_id;
  else
    stored_secret_id := vault.create_secret(
      p_page_access_token,
      'harpia_meta_page_' || btrim(p_page_id),
      'Harpia Meta Page access token',
      null
    );
  end if;

  insert into private.meta_page_token_refs(page_id, connection_id, secret_id)
  values (btrim(p_page_id), connection_uuid, stored_secret_id)
  on conflict (page_id) do update
  set connection_id = excluded.connection_id,
      secret_id = excluded.secret_id,
      updated_at = now();

  insert into public.integration_events(connection_id, provider, event_type, external_id, success, metadata)
  values (
    connection_uuid, 'meta', 'connection.configured', btrim(p_page_id), true,
    jsonb_build_object('form_count', coalesce(array_length(p_form_ids, 1), 0), 'graph_version', safe_graph_version)
  );

  return connection_uuid;
end;
$$;

create or replace function public.admin_resolve_meta_page_token(p_page_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_secret text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select ds.decrypted_secret into resolved_secret
  from private.meta_page_token_refs r
  join vault.decrypted_secrets ds on ds.id = r.secret_id
  where r.page_id = btrim(p_page_id);

  return resolved_secret;
end;
$$;

create or replace function public.admin_disconnect_meta_page(p_page_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_secret_id uuid;
  connection_uuid uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select r.secret_id, r.connection_id into existing_secret_id, connection_uuid
  from private.meta_page_token_refs r
  where r.page_id = btrim(p_page_id);

  if existing_secret_id is not null then
    delete from private.meta_page_token_refs where page_id = btrim(p_page_id);
    delete from vault.secrets where id = existing_secret_id;
  end if;

  update public.integration_connections
  set status = 'not_connected',
      last_health_at = now(),
      last_error_at = null,
      last_error_code = null,
      revision = revision + 1,
      updated_at = now()
  where provider = 'meta' and external_account_id = btrim(p_page_id)
  returning id into connection_uuid;

  if connection_uuid is not null then
    insert into public.integration_events(connection_id, provider, event_type, external_id, success)
    values (connection_uuid, 'meta', 'connection.disconnected', btrim(p_page_id), true);
    return true;
  end if;

  return existing_secret_id is not null;
end;
$$;

create or replace function public.admin_ingest_meta_lead(
  p_leadgen_id text,
  p_page_id text,
  p_form_id text,
  p_name text,
  p_email text default null,
  p_whatsapp text default null,
  p_created_time timestamptz default now(),
  p_ad_id text default null,
  p_adset_id text default null,
  p_campaign_id text default null,
  p_field_data jsonb default '[]'::jsonb,
  p_raw_lead jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  connection_uuid uuid;
  existing_crm_lead_id text;
  lead_id text;
  source_metadata jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if nullif(btrim(p_leadgen_id), '') is null then raise exception 'leadgen_id required'; end if;
  if nullif(btrim(p_page_id), '') is null then raise exception 'page_id required'; end if;

  select c.id into connection_uuid
  from public.integration_connections c
  where c.provider = 'meta' and c.external_account_id = btrim(p_page_id)
  order by c.updated_at desc
  limit 1;

  insert into public.meta_lead_receipts(
    connection_id, leadgen_id, page_id, form_id, ad_id, adset_id, campaign_id,
    created_time, field_data, raw_lead, status, updated_at
  )
  values (
    connection_uuid, btrim(p_leadgen_id), btrim(p_page_id), nullif(btrim(coalesce(p_form_id,'')), ''),
    nullif(btrim(coalesce(p_ad_id,'')), ''), nullif(btrim(coalesce(p_adset_id,'')), ''),
    nullif(btrim(coalesce(p_campaign_id,'')), ''), coalesce(p_created_time, now()),
    coalesce(p_field_data, '[]'::jsonb), coalesce(p_raw_lead, '{}'::jsonb), 'received', now()
  )
  on conflict (leadgen_id) do update
  set connection_id = coalesce(excluded.connection_id, public.meta_lead_receipts.connection_id),
      page_id = excluded.page_id,
      form_id = coalesce(excluded.form_id, public.meta_lead_receipts.form_id),
      ad_id = coalesce(excluded.ad_id, public.meta_lead_receipts.ad_id),
      adset_id = coalesce(excluded.adset_id, public.meta_lead_receipts.adset_id),
      campaign_id = coalesce(excluded.campaign_id, public.meta_lead_receipts.campaign_id),
      created_time = coalesce(excluded.created_time, public.meta_lead_receipts.created_time),
      field_data = excluded.field_data,
      raw_lead = excluded.raw_lead,
      updated_at = now();

  select r.crm_lead_id into existing_crm_lead_id
  from public.meta_lead_receipts r
  where r.leadgen_id = btrim(p_leadgen_id)
  for update;

  if existing_crm_lead_id is not null then
    return existing_crm_lead_id;
  end if;

  if nullif(btrim(coalesce(p_name,'')), '') is null then
    update public.meta_lead_receipts
    set status = 'invalid',
        last_error = 'Meta lead sem campo de nome utilizável.',
        processed_at = now(),
        updated_at = now()
    where leadgen_id = btrim(p_leadgen_id);
    return null;
  end if;

  source_metadata := jsonb_strip_nulls(jsonb_build_object(
    'provider', 'meta',
    'leadgenId', btrim(p_leadgen_id),
    'pageId', btrim(p_page_id),
    'formId', nullif(btrim(coalesce(p_form_id,'')), ''),
    'adId', nullif(btrim(coalesce(p_ad_id,'')), ''),
    'adsetId', nullif(btrim(coalesce(p_adset_id,'')), ''),
    'campaignId', nullif(btrim(coalesce(p_campaign_id,'')), ''),
    'fieldData', coalesce(p_field_data, '[]'::jsonb)
  ));

  lead_id := public.admin_ingest_public_lead(
    p_name => btrim(p_name),
    p_email => nullif(btrim(coalesce(p_email,'')), ''),
    p_whatsapp => nullif(btrim(coalesce(p_whatsapp,'')), ''),
    p_origin => 'meta_lead_ads',
    p_action => 'lead_ads_form',
    p_page => 'meta://page/' || btrim(p_page_id) || '/form/' || coalesce(nullif(btrim(coalesce(p_form_id,'')), ''), 'unknown'),
    p_interest => null,
    p_occurred_at => coalesce(p_created_time, now()),
    p_metadata => source_metadata
  );

  update public.meta_lead_receipts
  set crm_lead_id = lead_id,
      status = 'ingested',
      last_error = null,
      processed_at = now(),
      updated_at = now()
  where leadgen_id = btrim(p_leadgen_id);

  if connection_uuid is not null then
    update public.integration_connections
    set status = 'connected',
        last_health_at = now(),
        last_event_at = now(),
        last_error_at = null,
        last_error_code = null,
        revision = revision + 1,
        updated_at = now()
    where id = connection_uuid;
  end if;

  insert into public.integration_events(
    connection_id, provider, event_type, external_id, success, metadata
  )
  values (
    connection_uuid, 'meta', 'lead.ingested', btrim(p_leadgen_id), true,
    jsonb_strip_nulls(jsonb_build_object(
      'crmLeadId', lead_id,
      'pageId', btrim(p_page_id),
      'formId', nullif(btrim(coalesce(p_form_id,'')), ''),
      'adId', nullif(btrim(coalesce(p_ad_id,'')), ''),
      'adsetId', nullif(btrim(coalesce(p_adset_id,'')), ''),
      'campaignId', nullif(btrim(coalesce(p_campaign_id,'')), '')
    ))
  );

  return lead_id;
end;
$$;

revoke all on function public.admin_store_meta_page_token(text,text,text,text[],text) from public, anon, authenticated;
revoke all on function public.admin_resolve_meta_page_token(text) from public, anon, authenticated;
revoke all on function public.admin_disconnect_meta_page(text) from public, anon, authenticated;
revoke all on function public.admin_ingest_meta_lead(text,text,text,text,text,text,timestamptz,text,text,text,jsonb,jsonb) from public, anon, authenticated;

grant execute on function public.admin_store_meta_page_token(text,text,text,text[],text) to service_role;
grant execute on function public.admin_resolve_meta_page_token(text) to service_role;
grant execute on function public.admin_disconnect_meta_page(text) to service_role;
grant execute on function public.admin_ingest_meta_lead(text,text,text,text,text,text,timestamptz,text,text,text,jsonb,jsonb) to service_role;
