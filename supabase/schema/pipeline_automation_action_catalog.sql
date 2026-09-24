-- Pipeline action catalog extension.
-- Additive function used only by new pipeline action cards.
-- Existing admin_apply_crm_automation_action remains unchanged.

CREATE OR REPLACE FUNCTION public.admin_apply_crm_extended_automation_action(p_lead_id text, p_action_type text, p_config jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_state jsonb;
  leads jsonb;
  lead jsonb;
  lead_index integer;
  stages jsonb;
  stage jsonb;
  tags jsonb;
  tasks jsonb;
  history jsonb;
  timestamp_text text := now()::text;
  requested_id text;
  requested_title text := nullif(btrim(coalesce(p_config->>'title','')), '');
  requested_classification text := nullif(btrim(coalesce(p_config->>'classification','')), '');
  requested_relationship text := coalesce(nullif(btrim(coalesce(p_config->>'relationship','')), ''), 'interest');
  requested_quantity numeric := coalesce(nullif(btrim(coalesce(p_config->>'quantity','')), '')::numeric, 1);
  new_lead_id text;
  conversation_id text;
  message_id text;
  history_entry jsonb;
  copied_lead jsonb;
  affected integer := 0;
  new_tasks jsonb;
  new_history jsonb;
  field_list jsonb := '[]'::jsonb;
  product_uuid uuid;
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

  if p_action_type = 'duplicate_lead' then
    requested_id := nullif(btrim(coalesce(p_config->>'stageId','')), '');
    copied_lead := lead;
    new_lead_id := 'lead_' || gen_random_uuid()::text;

    copied_lead := jsonb_set(copied_lead, '{id}', to_jsonb(new_lead_id), true);
    copied_lead := jsonb_set(copied_lead, '{createdAt}', to_jsonb(timestamp_text), true);
    copied_lead := jsonb_set(copied_lead, '{updatedAt}', to_jsonb(timestamp_text), true);
    copied_lead := copied_lead - 'lastInteractionAt';

    if requested_id is not null then
      stages := coalesce(current_state->'stages', '[]'::jsonb);
      select value into stage
      from jsonb_array_elements(stages) x(value)
      where value->>'id' = requested_id
      limit 1;
      if stage is null then raise exception 'stage not found'; end if;
      copied_lead := jsonb_set(copied_lead, '{stageId}', to_jsonb(requested_id), true);
      copied_lead := jsonb_set(copied_lead, '{pipelineId}', to_jsonb(stage->>'pipelineId'), true);
    end if;

    history_entry := jsonb_build_object(
      'id', 'history_' || gen_random_uuid()::text,
      'leadId', new_lead_id,
      'type', 'lead_created',
      'description', 'Lead duplicado por automação.',
      'metadata', jsonb_build_object('sourceLeadId', p_lead_id),
      'createdAt', timestamp_text
    );
    current_state := jsonb_set(current_state, '{leads}', leads || jsonb_build_array(copied_lead), true);
    current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);
    affected := 1;

  elsif p_action_type = 'complete_tasks' then
    tasks := coalesce(current_state->'tasks','[]'::jsonb);
    select count(*)::integer into affected
    from jsonb_array_elements(tasks) item
    where item->>'leadId' = p_lead_id
      and item->>'status' = 'pending'
      and (requested_title is null or lower(item->>'title') = lower(requested_title));

    select coalesce(jsonb_agg(
      case
        when item->>'leadId' = p_lead_id
          and item->>'status' = 'pending'
          and (requested_title is null or lower(item->>'title') = lower(requested_title))
        then jsonb_set(jsonb_set(item, '{status}', '"done"'::jsonb, true), '{updatedAt}', to_jsonb(timestamp_text), true)
        else item
      end order by ordinality
    ), '[]'::jsonb)
    into new_tasks
    from jsonb_array_elements(tasks) with ordinality as x(item, ordinality);

    current_state := jsonb_set(current_state, '{tasks}', new_tasks, true);
    if affected > 0 then
      history_entry := jsonb_build_object(
        'id', 'history_' || gen_random_uuid()::text,
        'leadId', p_lead_id,
        'type', 'task_updated',
        'description', 'Tarefas concluídas por automação.',
        'metadata', jsonb_build_object('count', affected),
        'createdAt', timestamp_text
      );
      current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);
    end if;

  elsif p_action_type = 'delete_tasks' then
    tasks := coalesce(current_state->'tasks','[]'::jsonb);
    select count(*)::integer into affected
    from jsonb_array_elements(tasks) item
    where item->>'leadId' = p_lead_id
      and (requested_title is null or lower(item->>'title') = lower(requested_title));

    select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
    into new_tasks
    from jsonb_array_elements(tasks) with ordinality as x(item, ordinality)
    where not (
      item->>'leadId' = p_lead_id
      and (requested_title is null or lower(item->>'title') = lower(requested_title))
    );

    current_state := jsonb_set(current_state, '{tasks}', new_tasks, true);
    if affected > 0 then
      history_entry := jsonb_build_object(
        'id', 'history_' || gen_random_uuid()::text,
        'leadId', p_lead_id,
        'type', 'task_updated',
        'description', 'Tarefas excluídas por automação.',
        'metadata', jsonb_build_object('count', affected),
        'createdAt', timestamp_text
      );
      current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);
    end if;

  elsif p_action_type = 'replace_tags' then
    requested_id := nullif(btrim(coalesce(p_config->>'tagId','')), '');
    if requested_id is null then raise exception 'tagId required'; end if;
    tags := coalesce(current_state->'tags','[]'::jsonb);
    if not exists (select 1 from jsonb_array_elements(tags) item where item->>'id' = requested_id) then
      raise exception 'tag not found';
    end if;
    lead := jsonb_set(lead, '{tagIds}', jsonb_build_array(requested_id), true);
    lead := jsonb_set(lead, '{updatedAt}', to_jsonb(timestamp_text), true);
    current_state := jsonb_set(current_state, array['leads', lead_index::text], lead, false);
    history_entry := jsonb_build_object(
      'id', 'history_' || gen_random_uuid()::text,
      'leadId', p_lead_id,
      'type', 'tag_added',
      'description', 'Tags substituídas por automação.',
      'metadata', jsonb_build_object('tagId', requested_id, 'operation', 'replace'),
      'createdAt', timestamp_text
    );
    current_state := jsonb_set(current_state, '{history}', coalesce(current_state->'history','[]'::jsonb) || jsonb_build_array(history_entry), true);
    affected := 1;

  elsif p_action_type = 'delete_lead' then
    select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
      into leads
    from jsonb_array_elements(coalesce(current_state->'leads','[]'::jsonb)) with ordinality as x(item, ordinality)
    where item->>'id' <> p_lead_id;

    select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
      into new_tasks
    from jsonb_array_elements(coalesce(current_state->'tasks','[]'::jsonb)) with ordinality as x(item, ordinality)
    where item->>'leadId' <> p_lead_id;

    select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
      into new_history
    from jsonb_array_elements(coalesce(current_state->'history','[]'::jsonb)) with ordinality as x(item, ordinality)
    where item->>'leadId' <> p_lead_id;

    current_state := jsonb_set(current_state, '{leads}', leads, true);
    current_state := jsonb_set(current_state, '{tasks}', new_tasks, true);
    current_state := jsonb_set(current_state, '{history}', new_history, true);
    affected := 1;

  elsif p_action_type in ('internal_message','generate_form') then
    select c.id into conversation_id
    from public.inbox_conversations c
    where c.lead_id = p_lead_id
    order by c.last_message_at desc nulls last, c.updated_at desc
    limit 1;

    if conversation_id is null then
      conversation_id := 'conversation_internal_' || gen_random_uuid()::text;
      insert into public.inbox_conversations(
        id, lead_id, channel, provider, transport_status, last_message_at, created_at, updated_at
      ) values (
        conversation_id, p_lead_id, 'other', 'automation', 'not_connected', now(), now(), now()
      );
    end if;

    message_id := 'message_' || gen_random_uuid()::text;
    if p_action_type = 'internal_message' then
      if nullif(btrim(coalesce(p_config->>'message','')), '') is null then raise exception 'message required'; end if;
      insert into public.inbox_messages(
        id, conversation_id, provider, direction, type, text_content, delivery_status, created_at, updated_at
      ) values (
        message_id, conversation_id, 'automation', 'outbound', 'internal_note',
        btrim(p_config->>'message'), 'sent', now(), now()
      );
    else
      if requested_title is null then raise exception 'form title required'; end if;
      select coalesce(jsonb_agg(btrim(value)), '[]'::jsonb)
      into field_list
      from regexp_split_to_table(coalesce(p_config->>'fields',''), ',') value
      where nullif(btrim(value),'') is not null;

      insert into public.inbox_messages(
        id, conversation_id, provider, direction, type, text_content, form_payload, delivery_status, created_at, updated_at
      ) values (
        message_id, conversation_id, 'automation', 'outbound', 'form',
        requested_title,
        jsonb_build_object('title', requested_title, 'fields', field_list),
        'sent', now(), now()
      );
    end if;

    update public.inbox_conversations
    set last_message_at = now(), updated_at = now()
    where id = conversation_id;
    affected := 1;

  elsif p_action_type = 'delete_files' then
    delete from public.inbox_message_attachments a
    using public.inbox_messages m, public.inbox_conversations c
    where a.message_id = m.id
      and m.conversation_id = c.id
      and c.lead_id = p_lead_id
      and (
        requested_classification is null
        or coalesce(a.metadata->>'classification','') = requested_classification
      );
    get diagnostics affected = row_count;

  elsif p_action_type = 'link_product' then
    requested_id := nullif(btrim(coalesce(p_config->>'catalogItemId','')), '');
    if requested_id is null then raise exception 'catalogItemId required'; end if;
    begin
      product_uuid := requested_id::uuid;
    exception when invalid_text_representation then
      raise exception 'catalogItemId invalid';
    end;
    if not exists (
      select 1 from public.catalog_items item
      where item.id = product_uuid and item.deleted_at is null
    ) then raise exception 'catalog item not found'; end if;
    if requested_relationship not in ('interest','quoted','purchased') then raise exception 'invalid product relationship'; end if;
    if requested_quantity <= 0 then raise exception 'quantity must be greater than zero'; end if;

    insert into public.crm_lead_products(
      lead_id, catalog_item_id, relationship, quantity, created_at, updated_at
    ) values (
      p_lead_id, product_uuid, requested_relationship, requested_quantity, now(), now()
    )
    on conflict (lead_id, catalog_item_id) do update set
      relationship = excluded.relationship,
      quantity = excluded.quantity,
      updated_at = now();
    affected := 1;

  else
    raise exception 'unsupported extended crm automation action: %', p_action_type;
  end if;

  if p_action_type in ('duplicate_lead','complete_tasks','delete_tasks','replace_tags','delete_lead') then
    update public.platform_module_state
    set state = current_state,
        revision = revision + 1,
        updated_at = now(),
        updated_by = null
    where module = 'crm';
  end if;

  return jsonb_build_object(
    'status', 'accepted',
    'changed', affected > 0,
    'affected', affected,
    'newLeadId', new_lead_id,
    'conversationId', conversation_id,
    'messageId', message_id
  );
end;
$function$
;

revoke all on function public.admin_apply_crm_extended_automation_action(text,text,jsonb)
from public, anon, authenticated;
grant execute on function public.admin_apply_crm_extended_automation_action(text,text,jsonb)
to service_role;
