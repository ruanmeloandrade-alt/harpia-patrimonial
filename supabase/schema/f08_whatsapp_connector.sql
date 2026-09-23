-- Hárpia Patrimonial | F08 WhatsApp Web
-- Fundação server-side para sessão persistente, mídia e ingestão idempotente.

create table if not exists private.whatsapp_auth_state (
  session_id text not null,
  state_key text not null,
  encrypted_value text not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, state_key)
);

alter table private.whatsapp_auth_state enable row level security;
revoke all on private.whatsapp_auth_state from public, anon, authenticated;
grant select, insert, update, delete on private.whatsapp_auth_state to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'inbox-media',
  'inbox-media',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'video/mp4',
    'application/pdf',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inbox_media_read" on storage.objects;
create policy "inbox_media_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inbox-media'
  and (
    private.user_has_permission((select auth.uid()), 'inbox.view')
    or private.user_has_permission((select auth.uid()), 'inbox.manage')
  )
);

create or replace function public.admin_resolve_or_create_whatsapp_lead(
  p_phone text,
  p_display_name text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_phone text;
  lead_id text;
  current_state jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  normalized_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if normalized_phone = '' then raise exception 'phone required'; end if;

  select state into current_state
  from public.platform_module_state
  where module = 'crm';

  select lead->>'id'
    into lead_id
  from jsonb_array_elements(coalesce(current_state->'leads', '[]'::jsonb)) lead
  where regexp_replace(coalesce(lead->>'whatsapp', ''), '[^0-9]', '', 'g') = normalized_phone
  order by coalesce(lead->>'updatedAt', lead->>'createdAt') desc
  limit 1;

  if lead_id is not null then return lead_id; end if;

  return public.admin_ingest_public_lead(
    coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), p_phone),
    null,
    p_phone,
    'whatsapp_web',
    'inbound_message',
    null,
    jsonb_build_object('type', 'other', 'label', 'WhatsApp'),
    now(),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_resolve_or_create_whatsapp_lead(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.admin_resolve_or_create_whatsapp_lead(text,text,jsonb) to service_role;

create or replace function public.admin_ingest_whatsapp_message(
  p_external_message_id text,
  p_thread_id text,
  p_phone text,
  p_display_name text,
  p_type text,
  p_text text default null,
  p_received_at timestamptz default now(),
  p_attachment jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider_name text := 'whatsapp_web';
  lead_id text;
  conversation_id text;
  message_id text;
  received_at timestamptz := coalesce(p_received_at, now());
  inserted_message boolean := false;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if nullif(btrim(coalesce(p_external_message_id, '')), '') is null then
    raise exception 'external_message_id required';
  end if;
  if nullif(btrim(coalesce(p_thread_id, '')), '') is null then
    raise exception 'thread_id required';
  end if;
  if p_type not in ('text','audio','image','video','document','form') then
    raise exception 'unsupported message type';
  end if;

  select m.id, m.conversation_id
    into message_id, conversation_id
  from public.inbox_messages m
  where m.provider = provider_name
    and m.external_message_id = p_external_message_id
  limit 1;

  if message_id is not null then
    select c.lead_id into lead_id
    from public.inbox_conversations c
    where c.id = conversation_id;

    return jsonb_build_object(
      'duplicate', true,
      'leadId', lead_id,
      'conversationId', conversation_id,
      'messageId', message_id
    );
  end if;

  lead_id := public.admin_resolve_or_create_whatsapp_lead(
    p_phone,
    p_display_name,
    coalesce(p_metadata, '{}'::jsonb)
  );

  select c.id
    into conversation_id
  from public.inbox_conversations c
  where c.provider = provider_name
    and c.external_thread_id = p_thread_id
  limit 1;

  if conversation_id is null then
    conversation_id := 'conversation_' || gen_random_uuid()::text;
    begin
      insert into public.inbox_conversations (
        id,
        lead_id,
        channel,
        provider,
        external_thread_id,
        transport_status,
        last_message_at,
        created_at,
        updated_at
      ) values (
        conversation_id,
        lead_id,
        'whatsapp',
        provider_name,
        p_thread_id,
        'connected',
        received_at,
        received_at,
        received_at
      );
    exception when unique_violation then
      select c.id into conversation_id
      from public.inbox_conversations c
      where c.provider = provider_name
        and c.external_thread_id = p_thread_id
      limit 1;
    end;
  end if;

  message_id := 'message_' || gen_random_uuid()::text;
  begin
    insert into public.inbox_messages (
      id,
      conversation_id,
      provider,
      direction,
      type,
      text_content,
      delivery_status,
      external_message_id,
      provider_timestamp,
      created_at,
      updated_at
    ) values (
      message_id,
      conversation_id,
      provider_name,
      'inbound',
      p_type,
      nullif(p_text, ''),
      'received',
      p_external_message_id,
      received_at,
      received_at,
      received_at
    );
    inserted_message := true;
  exception when unique_violation then
    select m.id, m.conversation_id
      into message_id, conversation_id
    from public.inbox_messages m
    where m.provider = provider_name
      and m.external_message_id = p_external_message_id
    limit 1;
  end;

  if inserted_message and p_attachment is not null and jsonb_typeof(p_attachment) = 'object' then
    insert into public.inbox_message_attachments (
      message_id,
      name,
      mime_type,
      url,
      storage_bucket,
      storage_path,
      size_bytes,
      provider_media_id,
      metadata
    ) values (
      message_id,
      nullif(p_attachment->>'name', ''),
      nullif(p_attachment->>'mimeType', ''),
      nullif(p_attachment->>'url', ''),
      nullif(p_attachment->>'storageBucket', ''),
      nullif(p_attachment->>'storagePath', ''),
      case
        when nullif(p_attachment->>'size', '') is null then null
        else (p_attachment->>'size')::bigint
      end,
      nullif(p_attachment->>'providerMediaId', ''),
      coalesce(p_attachment->'metadata', '{}'::jsonb)
    )
    on conflict (message_id) do update set
      name = excluded.name,
      mime_type = excluded.mime_type,
      url = excluded.url,
      storage_bucket = excluded.storage_bucket,
      storage_path = excluded.storage_path,
      size_bytes = excluded.size_bytes,
      provider_media_id = excluded.provider_media_id,
      metadata = excluded.metadata;
  end if;

  update public.inbox_conversations
  set lead_id = lead_id,
      transport_status = 'connected',
      last_message_at = greatest(coalesce(last_message_at, received_at), received_at),
      updated_at = greatest(updated_at, received_at)
  where id = conversation_id;

  return jsonb_build_object(
    'duplicate', not inserted_message,
    'leadId', lead_id,
    'conversationId', conversation_id,
    'messageId', message_id
  );
end;
$$;

revoke all on function public.admin_ingest_whatsapp_message(text,text,text,text,text,text,timestamptz,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.admin_ingest_whatsapp_message(text,text,text,text,text,text,timestamptz,jsonb,jsonb) to service_role;
