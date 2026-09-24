create or replace function private.enrich_automation_event_lead_context()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  crm_state jsonb;
  lead jsonb;
  pipeline_id text;
  stage_id text;
begin
  if new.lead_id is null or new.event_type not like 'lead.%' then
    return new;
  end if;

  select state
    into crm_state
    from public.platform_module_state
   where module = 'crm'
   limit 1;

  if crm_state is null then
    return new;
  end if;

  select item
    into lead
    from jsonb_array_elements(coalesce(crm_state->'leads', '[]'::jsonb)) as rows(item)
   where item->>'id' = new.lead_id
   limit 1;

  if lead is null then
    return new;
  end if;

  pipeline_id := nullif(lead->>'pipelineId', '');
  stage_id := nullif(lead->>'stageId', '');

  new.payload := coalesce(new.payload, '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'pipelineId', pipeline_id,
      'stageId', stage_id,
      'source', nullif(lead->>'source',''),
      'assigneeId', nullif(lead->>'assigneeId',''),
      'lead', jsonb_strip_nulls(jsonb_build_object(
        'id', lead->>'id',
        'name', lead->>'name',
        'email', lead->>'email',
        'whatsapp', lead->>'whatsapp',
        'source', lead->>'source',
        'assigneeId', lead->>'assigneeId',
        'pipelineId', pipeline_id,
        'stageId', stage_id
      ))
    ));

  return new;
end;
$$;

revoke all on function private.enrich_automation_event_lead_context() from public, anon, authenticated;

drop trigger if exists automation_event_lead_context on public.automation_event_outbox;
create trigger automation_event_lead_context
before insert or update of payload, event_type, lead_id
on public.automation_event_outbox
for each row
execute function private.enrich_automation_event_lead_context();

update public.automation_event_outbox
   set payload = payload
 where processed_at is null
   and lead_id is not null
   and event_type like 'lead.%';
