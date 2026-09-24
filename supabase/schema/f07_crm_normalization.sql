-- Hárpia Patrimonial | F07 CRM normalization
-- Applied in Supabase as:
--   f07_crm_normalization_and_fk_indexes
--   f07_crm_lead_tag_position
--
-- This is additive. The legacy CRM JSON in platform_module_state remains available
-- during the transition, while the F07 runtime reads and writes normalized tables.

create table if not exists public.crm_pipelines (
  id text primary key,
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_pipeline_stages (
  id text primary key,
  pipeline_id text not null references public.crm_pipelines(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_pipeline_stages_pipeline_position_idx
  on public.crm_pipeline_stages(pipeline_id, position);

create table if not exists public.crm_leads (
  id text primary key,
  name text not null check (btrim(name) <> ''),
  email text,
  whatsapp text,
  source text,
  source_action text,
  source_page text,
  source_occurred_at timestamptz,
  source_metadata jsonb not null default '{}'::jsonb,
  interest_type text check (interest_type is null or interest_type in ('property','product','service','other')),
  interest_reference_id text,
  interest_label text,
  assignee_id text,
  pipeline_id text references public.crm_pipelines(id) on delete set null,
  stage_id text references public.crm_pipeline_stages(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_interaction_at timestamptz
);

create index if not exists crm_leads_pipeline_idx on public.crm_leads(pipeline_id);
create index if not exists crm_leads_stage_idx on public.crm_leads(stage_id);
create index if not exists crm_leads_assignee_idx on public.crm_leads(assignee_id) where assignee_id is not null;
create index if not exists crm_leads_updated_idx on public.crm_leads(updated_at desc);

create table if not exists public.crm_tags (
  id text primary key,
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists crm_tags_name_ci_uidx on public.crm_tags(lower(name));

create table if not exists public.crm_lead_tags (
  lead_id text not null references public.crm_leads(id) on delete cascade,
  tag_id text not null references public.crm_tags(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create index if not exists crm_lead_tags_tag_idx on public.crm_lead_tags(tag_id);
create index if not exists crm_lead_tags_lead_position_idx on public.crm_lead_tags(lead_id, position);

create table if not exists public.crm_custom_fields (
  id text primary key,
  name text not null check (btrim(name) <> ''),
  type text not null check (type in ('text','number','date','boolean','select','multiselect')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_lead_custom_field_values (
  lead_id text not null references public.crm_leads(id) on delete cascade,
  field_id text not null references public.crm_custom_fields(id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (lead_id, field_id)
);

create index if not exists crm_lead_custom_field_values_field_idx
  on public.crm_lead_custom_field_values(field_id);

create table if not exists public.crm_tasks (
  id text primary key,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  assignee_id text,
  due_at timestamptz,
  status text not null check (status in ('pending','done','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_tasks_lead_idx on public.crm_tasks(lead_id);
create index if not exists crm_tasks_due_idx on public.crm_tasks(status, due_at) where status = 'pending';

create table if not exists public.crm_history (
  id text primary key,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  type text not null check (type in (
    'lead_created','lead_updated','stage_changed','assignee_changed',
    'tag_added','tag_removed','custom_field_changed','task_created','task_updated'
  )),
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_history_lead_created_idx
  on public.crm_history(lead_id, created_at desc);

-- F07 Inbox FK indexes flagged by the Supabase performance advisor.
create index if not exists inbox_channel_accounts_connection_idx
  on public.inbox_channel_accounts(connection_id)
  where connection_id is not null;

create index if not exists inbox_conversations_channel_account_idx
  on public.inbox_conversations(channel_account_id)
  where channel_account_id is not null;

create index if not exists integration_events_connection_idx
  on public.integration_events(connection_id)
  where connection_id is not null;

alter table public.crm_pipelines enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_lead_tags enable row level security;
alter table public.crm_custom_fields enable row level security;
alter table public.crm_lead_custom_field_values enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_history enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_pipelines',
    'crm_pipeline_stages',
    'crm_leads',
    'crm_tags',
    'crm_lead_tags',
    'crm_custom_fields',
    'crm_lead_custom_field_values',
    'crm_tasks',
    'crm_history'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_read', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_read_platform_module(''crm'')))',
      table_name || '_read',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.can_write_platform_module(''crm'')))',
      table_name || '_insert',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.can_write_platform_module(''crm''))) with check ((select private.can_write_platform_module(''crm'')))',
      table_name || '_update',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.can_write_platform_module(''crm'')))',
      table_name || '_delete',
      table_name
    );

    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
  end loop;
end
$$;

-- Import any legacy CRM state that exists when this schema is first applied.
insert into public.crm_pipelines (id, name, active, created_at, updated_at)
select
  pipeline->>'id',
  pipeline->>'name',
  coalesce((pipeline->>'active')::boolean, true),
  coalesce(nullif(pipeline->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(pipeline->>'updatedAt','')::timestamptz, now())
from public.platform_module_state s,
lateral jsonb_array_elements(coalesce(s.state->'pipelines','[]'::jsonb)) pipeline
where s.module = 'crm'
  and nullif(pipeline->>'id','') is not null
  and nullif(btrim(pipeline->>'name'),'') is not null
on conflict (id) do nothing;

insert into public.crm_pipeline_stages (id, pipeline_id, name, position, created_at, updated_at)
select
  stage->>'id',
  stage->>'pipelineId',
  stage->>'name',
  coalesce((stage->>'position')::integer, 0),
  coalesce(nullif(stage->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(stage->>'updatedAt','')::timestamptz, now())
from public.platform_module_state s
cross join lateral jsonb_array_elements(coalesce(s.state->'stages','[]'::jsonb)) stage
join public.crm_pipelines p on p.id = stage->>'pipelineId'
where s.module = 'crm'
  and nullif(stage->>'id','') is not null
  and nullif(btrim(stage->>'name'),'') is not null
on conflict (id) do nothing;

insert into public.crm_leads (
  id, name, email, whatsapp, source, source_action, source_page, source_occurred_at,
  source_metadata, interest_type, interest_reference_id, interest_label, assignee_id,
  pipeline_id, stage_id, notes, created_at, updated_at, last_interaction_at
)
select
  lead->>'id',
  lead->>'name',
  nullif(lead->>'email',''),
  nullif(lead->>'whatsapp',''),
  nullif(lead->>'source',''),
  nullif(lead->>'sourceAction',''),
  nullif(lead->>'sourcePage',''),
  nullif(lead->>'sourceOccurredAt','')::timestamptz,
  coalesce(lead->'sourceMetadata','{}'::jsonb),
  nullif(lead->'interest'->>'type',''),
  nullif(lead->'interest'->>'referenceId',''),
  nullif(lead->'interest'->>'label',''),
  nullif(lead->>'assigneeId',''),
  case when p.id is not null then p.id else null end,
  case when st.id is not null then st.id else null end,
  nullif(lead->>'notes',''),
  coalesce(nullif(lead->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(lead->>'updatedAt','')::timestamptz, now()),
  nullif(lead->>'lastInteractionAt','')::timestamptz
from public.platform_module_state s
cross join lateral jsonb_array_elements(coalesce(s.state->'leads','[]'::jsonb)) lead
left join public.crm_pipelines p on p.id = lead->>'pipelineId'
left join public.crm_pipeline_stages st on st.id = lead->>'stageId'
where s.module = 'crm'
  and nullif(lead->>'id','') is not null
  and nullif(btrim(lead->>'name'),'') is not null
on conflict (id) do nothing;

insert into public.crm_tags (id, name, created_at, updated_at)
select
  tag->>'id',
  tag->>'name',
  coalesce(nullif(tag->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(tag->>'updatedAt','')::timestamptz, now())
from public.platform_module_state s,
lateral jsonb_array_elements(coalesce(s.state->'tags','[]'::jsonb)) tag
where s.module = 'crm'
  and nullif(tag->>'id','') is not null
  and nullif(btrim(tag->>'name'),'') is not null
on conflict (id) do nothing;

insert into public.crm_custom_fields (id, name, type, options, active, created_at, updated_at)
select
  field->>'id',
  field->>'name',
  field->>'type',
  case when jsonb_typeof(field->'options') = 'array' then field->'options' else '[]'::jsonb end,
  coalesce((field->>'active')::boolean, true),
  coalesce(nullif(field->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(field->>'updatedAt','')::timestamptz, now())
from public.platform_module_state s,
lateral jsonb_array_elements(coalesce(s.state->'customFieldDefinitions','[]'::jsonb)) field
where s.module = 'crm'
  and nullif(field->>'id','') is not null
  and nullif(btrim(field->>'name'),'') is not null
  and field->>'type' in ('text','number','date','boolean','select','multiselect')
on conflict (id) do nothing;

insert into public.crm_lead_tags (lead_id, tag_id, position)
select lead_row.id, tag_row.id, tag_position - 1
from public.platform_module_state s
cross join lateral jsonb_array_elements(coalesce(s.state->'leads','[]'::jsonb)) lead
join public.crm_leads lead_row on lead_row.id = lead->>'id'
cross join lateral jsonb_array_elements_text(coalesce(lead->'tagIds','[]'::jsonb))
  with ordinality as lead_tag(tag_id, tag_position)
join public.crm_tags tag_row on tag_row.id = lead_tag.tag_id
where s.module = 'crm'
on conflict (lead_id, tag_id) do nothing;

insert into public.crm_lead_custom_field_values (lead_id, field_id, value, updated_at)
select lead_row.id, field_row.id, pair.value, lead_row.updated_at
from public.platform_module_state s
cross join lateral jsonb_array_elements(coalesce(s.state->'leads','[]'::jsonb)) lead
join public.crm_leads lead_row on lead_row.id = lead->>'id'
cross join lateral jsonb_each(coalesce(lead->'customFields','{}'::jsonb)) pair
join public.crm_custom_fields field_row on field_row.id = pair.key
where s.module = 'crm'
on conflict (lead_id, field_id) do nothing;

insert into public.crm_tasks (
  id, lead_id, title, assignee_id, due_at, status, notes, created_at, updated_at
)
select
  task->>'id',
  task->>'leadId',
  task->>'title',
  nullif(task->>'assigneeId',''),
  nullif(task->>'dueAt','')::timestamptz,
  task->>'status',
  nullif(task->>'notes',''),
  coalesce(nullif(task->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(task->>'updatedAt','')::timestamptz, now())
from public.platform_module_state s
cross join lateral jsonb_array_elements(coalesce(s.state->'tasks','[]'::jsonb)) task
join public.crm_leads lead_row on lead_row.id = task->>'leadId'
where s.module = 'crm'
  and nullif(task->>'id','') is not null
  and nullif(btrim(task->>'title'),'') is not null
  and task->>'status' in ('pending','done','cancelled')
on conflict (id) do nothing;

insert into public.crm_history (id, lead_id, type, description, metadata, created_at)
select
  history->>'id',
  history->>'leadId',
  history->>'type',
  history->>'description',
  history->'metadata',
  coalesce(nullif(history->>'createdAt','')::timestamptz, now())
from public.platform_module_state s
cross join lateral jsonb_array_elements(coalesce(s.state->'history','[]'::jsonb)) history
join public.crm_leads lead_row on lead_row.id = history->>'leadId'
where s.module = 'crm'
  and nullif(history->>'id','') is not null
  and history->>'type' in (
    'lead_created','lead_updated','stage_changed','assignee_changed',
    'tag_added','tag_removed','custom_field_changed','task_created','task_updated'
  )
on conflict (id) do nothing;

-- Public lead ingestion dual-writes while main still depends on platform_module_state.
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
  timestamp_value timestamptz;
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

  current_state := jsonb_set(
    current_state,
    '{leads}',
    coalesce(current_state->'leads','[]'::jsonb) || jsonb_build_array(lead),
    true
  );
  current_state := jsonb_set(
    current_state,
    '{history}',
    coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry),
    true
  );

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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_pipelines',
    'crm_pipeline_stages',
    'crm_leads',
    'crm_tags',
    'crm_lead_tags',
    'crm_custom_fields',
    'crm_lead_custom_field_values',
    'crm_tasks',
    'crm_history'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
