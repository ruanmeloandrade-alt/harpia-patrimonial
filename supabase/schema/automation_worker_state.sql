create table if not exists public.automation_action_runs (
  event_id uuid not null references public.automation_event_outbox(id) on delete cascade,
  automation_id text not null,
  action_id text not null,
  action_type text not null,
  status text not null check (status in ('accepted','rejected','not_configured')),
  result jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 1 check (attempt_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, automation_id, action_id)
);

alter table public.automation_action_runs enable row level security;
revoke all on public.automation_action_runs from public, anon, authenticated;
grant select, insert, update, delete on public.automation_action_runs to service_role;

-- Estado interno do worker: nenhum cliente lê ou escreve esta tabela.
-- A policy explícita preserva default-deny mesmo se um GRANT for ampliado no futuro.
drop policy if exists automation_action_runs_client_deny on public.automation_action_runs;
create policy automation_action_runs_client_deny
on public.automation_action_runs
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.admin_apply_crm_automation_action(
  p_lead_id text,
  p_action_type text,
  p_config jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state jsonb;
  leads jsonb;
  lead jsonb;
  lead_index integer;
  stages jsonb;
  tags jsonb;
  fields jsonb;
  stage jsonb;
  tag jsonb;
  field_def jsonb;
  history_entry jsonb;
  task_entry jsonb;
  timestamp_text text := now()::text;
  old_value jsonb;
  new_value jsonb;
  old_text text;
  new_text text;
  changed boolean := false;
  followup_type text;
  followup_payload jsonb := '{}'::jsonb;
  requested_id text;
  history_type text;
  description text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select state into current_state
  from public.platform_module_state
  where module = 'crm'
  for update;

  if current_state is null then raise exception 'crm state not found'; end if;
  leads := coalesce(current_state->'leads', '[]'::jsonb);

  select (ordinality - 1)::integer, value
    into lead_index, lead
  from jsonb_array_elements(leads) with ordinality as x(value, ordinality)
  where value->>'id' = p_lead_id
  limit 1;

  if lead is null then raise exception 'lead not found'; end if;

  if p_action_type = 'move_stage' then
    requested_id := nullif(btrim(coalesce(p_config->>'stageId','')), '');
    if requested_id is null then raise exception 'stageId required'; end if;
    stages := coalesce(current_state->'stages', '[]'::jsonb);
    select value into stage from jsonb_array_elements(stages) x(value) where value->>'id' = requested_id limit 1;
    if stage is null then raise exception 'stage not found'; end if;
    if coalesce(lead->>'stageId','') <> requested_id or coalesce(lead->>'pipelineId','') <> coalesce(stage->>'pipelineId','') then
      old_text := nullif(lead->>'stageId','');
      lead := jsonb_set(lead, '{stageId}', to_jsonb(requested_id), true);
      lead := jsonb_set(lead, '{pipelineId}', to_jsonb(stage->>'pipelineId'), true);
      lead := jsonb_set(lead, '{updatedAt}', to_jsonb(timestamp_text), true);
      changed := true;
      history_type := 'stage_changed';
      description := 'Lead movido de etapa por automação.';
      followup_type := 'lead.stage_changed';
      followup_payload := jsonb_build_object('previousStageId', old_text, 'stageId', requested_id, 'pipelineId', stage->>'pipelineId');
    end if;

  elsif p_action_type = 'assign_owner' then
    requested_id := nullif(btrim(coalesce(p_config->>'userId','')), '');
    if requested_id is null then raise exception 'userId required'; end if;
    if not exists (
      select 1 from public.user_profiles p
      where p.id::text = requested_id and p.account_type = 'internal'::public.account_type and p.is_active = true
    ) then raise exception 'assignee not found or inactive'; end if;
    if coalesce(lead->>'assigneeId','') <> requested_id then
      old_text := nullif(lead->>'assigneeId','');
      lead := jsonb_set(lead, '{assigneeId}', to_jsonb(requested_id), true);
      lead := jsonb_set(lead, '{updatedAt}', to_jsonb(timestamp_text), true);
      changed := true;
      history_type := 'assignee_changed';
      description := 'Responsável do lead alterado por automação.';
      followup_type := 'lead.assignee_changed';
      followup_payload := jsonb_build_object('previousAssigneeId', old_text, 'assigneeId', requested_id);
    end if;

  elsif p_action_type = 'create_task' then
    new_text := nullif(btrim(coalesce(p_config->>'title','')), '');
    if new_text is null then raise exception 'task title required'; end if;
    task_entry := jsonb_strip_nulls(jsonb_build_object(
      'id', 'task_' || gen_random_uuid()::text,
      'leadId', p_lead_id,
      'title', new_text,
      'dueAt', nullif(btrim(coalesce(p_config->>'dueAt','')), ''),
      'status', 'pending',
      'createdAt', timestamp_text,
      'updatedAt', timestamp_text
    ));
    current_state := jsonb_set(current_state, '{tasks}', coalesce(current_state->'tasks','[]'::jsonb) || jsonb_build_array(task_entry), true);
    changed := true;
    history_type := 'task_created';
    description := 'Tarefa criada para o lead por automação.';
    followup_payload := jsonb_build_object('taskId', task_entry->>'id');

  elsif p_action_type = 'update_field' then
    requested_id := nullif(btrim(coalesce(p_config->>'fieldId','')), '');
    if requested_id is null then raise exception 'fieldId required'; end if;
    fields := coalesce(current_state->'customFieldDefinitions', '[]'::jsonb);
    select value into field_def from jsonb_array_elements(fields) x(value) where value->>'id' = requested_id and coalesce((value->>'active')::boolean, true) limit 1;
    if field_def is null then raise exception 'custom field not found or inactive'; end if;
    new_value := p_config->'value';
    if new_value is null then new_value := 'null'::jsonb; end if;
    old_value := coalesce(lead->'customFields'->requested_id, 'null'::jsonb);
    if old_value is distinct from new_value then
      lead := jsonb_set(lead, array['customFields', requested_id], new_value, true);
      lead := jsonb_set(lead, '{updatedAt}', to_jsonb(timestamp_text), true);
      changed := true;
      history_type := 'custom_field_changed';
      description := 'Campo personalizado alterado por automação.';
      followup_type := 'lead.field_changed';
      followup_payload := jsonb_build_object('fieldId', requested_id, 'previousValue', old_value, 'value', new_value);
    end if;

  elsif p_action_type in ('add_tag','remove_tag') then
    requested_id := nullif(btrim(coalesce(p_config->>'tagId','')), '');
    if requested_id is null then raise exception 'tagId required'; end if;
    tags := coalesce(current_state->'tags', '[]'::jsonb);
    select value into tag from jsonb_array_elements(tags) x(value) where value->>'id' = requested_id limit 1;
    if tag is null then raise exception 'tag not found'; end if;
    if p_action_type = 'add_tag' then
      if not exists (select 1 from jsonb_array_elements_text(coalesce(lead->'tagIds','[]'::jsonb)) v where v = requested_id) then
        lead := jsonb_set(lead, '{tagIds}', coalesce(lead->'tagIds','[]'::jsonb) || to_jsonb(requested_id), true);
        lead := jsonb_set(lead, '{updatedAt}', to_jsonb(timestamp_text), true);
        changed := true;
        history_type := 'tag_added';
        description := 'Tag adicionada ao lead por automação.';
        followup_type := 'lead.tag_added';
        followup_payload := jsonb_build_object('tagId', requested_id);
      end if;
    else
      if exists (select 1 from jsonb_array_elements_text(coalesce(lead->'tagIds','[]'::jsonb)) v where v = requested_id) then
        lead := jsonb_set(lead, '{tagIds}', coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(lead->'tagIds','[]'::jsonb)) v where v <> requested_id), '[]'::jsonb), true);
        lead := jsonb_set(lead, '{updatedAt}', to_jsonb(timestamp_text), true);
        changed := true;
        history_type := 'tag_removed';
        description := 'Tag removida do lead por automação.';
        followup_type := 'lead.tag_removed';
        followup_payload := jsonb_build_object('tagId', requested_id);
      end if;
    end if;
  else
    raise exception 'unsupported crm automation action: %', p_action_type;
  end if;

  if changed then
    if p_action_type <> 'create_task' then
      current_state := jsonb_set(current_state, array['leads', lead_index::text], lead, false);
    end if;

    history_entry := jsonb_build_object(
      'id', 'history_' || gen_random_uuid()::text,
      'leadId', p_lead_id,
      'type', history_type,
      'description', description,
      'metadata', followup_payload,
      'createdAt', timestamp_text
    );
    current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);

    update public.platform_module_state
       set state = current_state,
           revision = revision + 1,
           updated_at = now(),
           updated_by = null
     where module = 'crm';

    if followup_type is not null then
      insert into public.automation_event_outbox(event_type, lead_id, payload)
      values (followup_type, p_lead_id, followup_payload);
    end if;
  end if;

  return jsonb_build_object('status','accepted','changed',changed,'followupEvent',followup_type);
end;
$$;

revoke all on function public.admin_apply_crm_automation_action(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.admin_apply_crm_automation_action(text,text,jsonb) to service_role;
