-- Hárpia Patrimonial | WhatsApp inbound CRM placement
-- Every newly ingested public/WhatsApp lead enters the first active pipeline
-- and its first stage. Inbound WhatsApp messages also refresh last interaction.

do $$
declare
  fn text;
begin
  select pg_get_functiondef(
    'public.admin_ingest_public_lead(text,text,text,text,text,text,jsonb,timestamptz,jsonb)'::regprocedure
  ) into fn;

  fn := replace(
    fn,
    '  claims_role text;' || E'\n' || 'begin',
    '  claims_role text;' || E'\n' ||
    '  v_pipeline_id text;' || E'\n' ||
    '  v_stage_id text;' || E'\n' ||
    'begin'
  );

  fn := replace(
    fn,
    '  timestamp_text := timestamp_value::text;' || E'\n\n' ||
    '  insert into public.crm_leads (',
    '  timestamp_text := timestamp_value::text;' || E'\n\n' ||
    '  select p.id into v_pipeline_id' || E'\n' ||
    '  from public.crm_pipelines p' || E'\n' ||
    '  where p.active = true' || E'\n' ||
    '  order by p.created_at asc, p.id asc' || E'\n' ||
    '  limit 1;' || E'\n\n' ||
    '  if v_pipeline_id is not null then' || E'\n' ||
    '    select s.id into v_stage_id' || E'\n' ||
    '    from public.crm_pipeline_stages s' || E'\n' ||
    '    where s.pipeline_id = v_pipeline_id' || E'\n' ||
    '    order by s.position asc, s.created_at asc, s.id asc' || E'\n' ||
    '    limit 1;' || E'\n' ||
    '  end if;' || E'\n\n' ||
    '  insert into public.crm_leads ('
  );

  fn := replace(
    fn,
    '    source_metadata, interest_type, interest_reference_id, interest_label,' || E'\n' ||
    '    created_at, updated_at',
    '    source_metadata, interest_type, interest_reference_id, interest_label,' || E'\n' ||
    '    pipeline_id, stage_id,' || E'\n' ||
    '    created_at, updated_at'
  );

  fn := replace(
    fn,
    '    nullif(p_interest->>''label'',''''),' || E'\n' ||
    '    timestamp_value,',
    '    nullif(p_interest->>''label'',''''),' || E'\n' ||
    '    v_pipeline_id,' || E'\n' ||
    '    v_stage_id,' || E'\n' ||
    '    timestamp_value,'
  );

  fn := replace(
    fn,
    '    ''interest'', p_interest,' || E'\n' ||
    '    ''tagIds'', ''[]''::jsonb,',
    '    ''interest'', p_interest,' || E'\n' ||
    '    ''pipelineId'', v_pipeline_id,' || E'\n' ||
    '    ''stageId'', v_stage_id,' || E'\n' ||
    '    ''tagIds'', ''[]''::jsonb,'
  );

  execute fn;
end
$$;

do $$
declare
  fn text;
begin
  select pg_get_functiondef(
    'public.admin_ingest_whatsapp_message(text,text,text,text,text,text,timestamptz,jsonb,jsonb,uuid)'::regprocedure
  ) into fn;

  if position('update public.crm_leads' in fn) = 0 then
    fn := replace(
      fn,
      '  update public.inbox_conversations' || E'\n',
      '  update public.crm_leads' || E'\n' ||
      '  set last_interaction_at = greatest(coalesce(last_interaction_at, received_at), received_at),' || E'\n' ||
      '      updated_at = greatest(updated_at, received_at)' || E'\n' ||
      '  where id = v_lead_id;' || E'\n\n' ||
      '  update public.inbox_conversations' || E'\n'
    );
    execute fn;
  end if;
end
$$;
