-- Preserve the existing public ingestion contract and make owner submissions
-- readable in the CRM notes field, without publishing catalog entries.
CREATE OR REPLACE FUNCTION public.admin_ingest_public_lead(p_name text, p_email text DEFAULT NULL::text, p_whatsapp text DEFAULT NULL::text, p_origin text DEFAULT 'site'::text, p_action text DEFAULT NULL::text, p_page text DEFAULT NULL::text, p_interest jsonb DEFAULT NULL::jsonb, p_occurred_at timestamp with time zone DEFAULT now(), p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_pipeline_id text;
  v_stage_id text;
  owner_registration_notes text;
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

  -- The existing CRM reads notes. Keep the submitted property data visible there
  -- while preserving the structured, complete source_metadata for integration.
  if p_origin = 'captacao-proprietario' and p_action = 'owner-property-registration' then
    owner_registration_notes := concat_ws(E'\n',
      'CADASTRO DE IMÓVEL RECEBIDO PELO SITE',
      'Tipo: ' || coalesce(p_metadata->>'propertyType', ''),
      'Finalidade: ' || case p_metadata->>'intent' when 'venda' then 'Venda' when 'locacao' then 'Aluguel' else coalesce(p_metadata->>'intent', '') end,
      'Previsão de valor, incluindo comissão: R$ ' || case
        when jsonb_typeof(p_metadata->'expectedValue') = 'number'
        then translate(to_char((p_metadata->>'expectedValue')::numeric, 'FM999,999,999,999,990.00'), ',.', '.,')
        else coalesce(p_metadata->>'expectedValue', '') end,
      'Endereço: ' || coalesce(p_metadata->>'propertyAddress', ''),
      case when nullif(p_metadata->>'secondaryPhone', '') is not null then 'Segundo celular: ' || (p_metadata->>'secondaryPhone') end,
      'Autorização para análise e contato: ' || case when p_metadata->>'consent' = 'true' then 'Sim' else 'Não informada' end,
      case when nullif(p_metadata->>'consentAt', '') is not null then 'Autorização registrada em: ' || (p_metadata->>'consentAt') end,
      'DESCRIÇÃO DO IMÓVEL',
      coalesce(p_metadata->>'description', '')
    );
  end if;

  select p.id into v_pipeline_id
  from public.crm_pipelines p
  where p.active = true
  order by p.created_at asc, p.id asc
  limit 1;

  if v_pipeline_id is not null then
    select s.id into v_stage_id
    from public.crm_pipeline_stages s
    where s.pipeline_id = v_pipeline_id
    order by s.position asc, s.created_at asc, s.id asc
    limit 1;
  end if;

  insert into public.crm_leads (
    id, name, email, whatsapp, source, source_action, source_page, source_occurred_at,
    source_metadata, interest_type, interest_reference_id, interest_label,
    pipeline_id, stage_id,
    notes, last_interaction_at,
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
    v_pipeline_id,
    v_stage_id,
    owner_registration_notes,
    timestamp_value,
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
    'pipelineId', v_pipeline_id,
    'stageId', v_stage_id,
    'tagIds', '[]'::jsonb,
    'customFields', '{}'::jsonb,
    'notes', owner_registration_notes,
    'lastInteractionAt', timestamp_text,
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
$function$
