-- Hárpia Patrimonial | F08
-- Prepara uma conversa interna para saída pelo WhatsApp somente com conector saudável.

create or replace function public.admin_prepare_whatsapp_conversation(
  p_conversation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead_id text;
  v_phone text;
  v_thread_id text;
  v_state jsonb;
  v_channel_account_id uuid;
  v_existing_conversation_id text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if nullif(btrim(coalesce(p_conversation_id, '')), '') is null then
    raise exception 'conversation_id required';
  end if;

  if not exists (
    select 1
    from public.integration_connections c
    where c.provider = 'whatsapp'
      and c.status = 'connected'
      and c.last_health_at is not null
      and c.last_health_at >= now() - interval '120 seconds'
  ) then
    raise exception 'whatsapp connector is not healthy';
  end if;

  select c.lead_id
    into v_lead_id
  from public.inbox_conversations c
  where c.id = p_conversation_id;

  if v_lead_id is null then
    raise exception 'conversation not found';
  end if;

  select s.state
    into v_state
  from public.platform_module_state s
  where s.module = 'crm';

  select regexp_replace(coalesce(lead->>'whatsapp', ''), '[^0-9]', '', 'g')
    into v_phone
  from jsonb_array_elements(coalesce(v_state->'leads', '[]'::jsonb)) lead
  where lead->>'id' = v_lead_id
  limit 1;

  if nullif(v_phone, '') is null or length(v_phone) < 8 then
    raise exception 'lead has no valid whatsapp';
  end if;

  v_thread_id := v_phone || '@s.whatsapp.net';

  select c.id
    into v_existing_conversation_id
  from public.inbox_conversations c
  where c.provider = 'whatsapp_web'
    and c.external_thread_id = v_thread_id
    and c.id <> p_conversation_id
  limit 1;

  if v_existing_conversation_id is not null then
    raise exception 'phone already linked to another conversation';
  end if;

  select a.id
    into v_channel_account_id
  from public.inbox_channel_accounts a
  where a.provider = 'whatsapp_web'
    and a.status = 'connected'
    and a.last_heartbeat_at is not null
    and a.last_heartbeat_at >= now() - interval '120 seconds'
  order by a.last_heartbeat_at desc
  limit 1;

  update public.inbox_conversations
  set channel = 'whatsapp',
      provider = 'whatsapp_web',
      channel_account_id = v_channel_account_id,
      external_thread_id = v_thread_id,
      transport_status = 'connected',
      updated_at = now()
  where id = p_conversation_id;

  return jsonb_build_object(
    'conversationId', p_conversation_id,
    'leadId', v_lead_id,
    'threadId', v_thread_id,
    'phone', v_phone
  );
end;
$$;

revoke all on function public.admin_prepare_whatsapp_conversation(text) from public, anon, authenticated;
grant execute on function public.admin_prepare_whatsapp_conversation(text) to service_role;
