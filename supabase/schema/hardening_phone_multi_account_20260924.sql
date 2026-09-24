-- Hárpia Patrimonial | hardening 2026-09-24
-- Normalização internacional de WhatsApp + responsabilidade por conta de canal.

create or replace function public.normalize_whatsapp_number(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw text := btrim(coalesce(p_value, ''));
  digits text;
  explicit_international boolean;
begin
  if raw = '' then return null; end if;
  if raw ~ '[A-Za-z]' then
    raise exception 'invalid whatsapp number';
  end if;

  explicit_international := raw ~ '^\s*(\+|00)';
  digits := regexp_replace(raw, '[^0-9]', '', 'g');

  if left(digits, 2) = '00' then
    digits := substr(digits, 3);
  end if;

  if not explicit_international and length(digits) in (10, 11) then
    digits := '55' || digits;
  end if;

  if length(digits) < 8 or length(digits) > 15 then
    raise exception 'invalid whatsapp number';
  end if;

  return digits;
end;
$$;

alter table public.inbox_channel_accounts
  add column if not exists responsible_user_id uuid null
  references public.user_profiles(id) on delete set null;

create index if not exists inbox_channel_accounts_responsible_idx
  on public.inbox_channel_accounts(responsible_user_id)
  where responsible_user_id is not null;

create or replace function private.validate_channel_account_responsible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.responsible_user_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.user_profiles p
    where p.id = new.responsible_user_id
      and p.account_type = 'internal'
      and p.is_active = true
  ) then
    raise exception 'responsible user must be an active internal user';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_channel_account_responsible on public.inbox_channel_accounts;
create trigger trg_validate_channel_account_responsible
before insert or update of responsible_user_id
on public.inbox_channel_accounts
for each row execute function private.validate_channel_account_responsible();

drop policy if exists "inbox_channel_accounts_manage" on public.inbox_channel_accounts;
create policy "inbox_channel_accounts_manage"
on public.inbox_channel_accounts
for update
to authenticated
using (private.user_has_permission((select auth.uid()), 'integrations.manage'))
with check (private.user_has_permission((select auth.uid()), 'integrations.manage'));

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
  v_channel_account_id uuid;
  v_existing_conversation_id text;
begin
  if coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if nullif(btrim(coalesce(p_conversation_id, '')), '') is null then
    raise exception 'conversation_id required';
  end if;

  select c.lead_id, c.channel_account_id
    into v_lead_id, v_channel_account_id
  from public.inbox_conversations c
  where c.id = p_conversation_id;

  if v_lead_id is null then raise exception 'conversation not found'; end if;

  select public.normalize_whatsapp_number(l.whatsapp)
    into v_phone
  from public.crm_leads l
  where l.id = v_lead_id
  limit 1;

  if v_phone is null then
    raise exception 'lead has no valid whatsapp';
  end if;

  if v_channel_account_id is not null and not exists (
    select 1
    from public.inbox_channel_accounts a
    where a.id = v_channel_account_id
      and a.provider = 'whatsapp_web'
      and a.status = 'connected'
      and a.last_heartbeat_at is not null
      and a.last_heartbeat_at >= now() - interval '120 seconds'
  ) then
    v_channel_account_id := null;
  end if;

  if v_channel_account_id is null then
    select a.id
      into v_channel_account_id
    from public.inbox_channel_accounts a
    where a.provider = 'whatsapp_web'
      and a.status = 'connected'
      and a.last_heartbeat_at is not null
      and a.last_heartbeat_at >= now() - interval '120 seconds'
    order by
      case when a.responsible_user_id is not null then 0 else 1 end,
      a.last_heartbeat_at desc
    limit 1;
  end if;

  if v_channel_account_id is null then
    raise exception 'whatsapp connector is not healthy';
  end if;

  v_thread_id := v_phone || '@s.whatsapp.net';

  select c.id into v_existing_conversation_id
  from public.inbox_conversations c
  where c.provider = 'whatsapp_web'
    and c.external_thread_id = v_thread_id
    and c.channel_account_id = v_channel_account_id
    and c.id <> p_conversation_id
  limit 1;

  if v_existing_conversation_id is not null then
    raise exception 'phone already linked to another conversation on this account';
  end if;

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
    'phone', v_phone,
    'channelAccountId', v_channel_account_id
  );
end;
$$;

revoke all on function public.admin_prepare_whatsapp_conversation(text) from public, anon, authenticated;
grant execute on function public.admin_prepare_whatsapp_conversation(text) to service_role;

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
  v_lead_id text;
begin
  if coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  normalized_phone := public.normalize_whatsapp_number(p_phone);
  if normalized_phone is null then raise exception 'phone required'; end if;

  select l.id
    into v_lead_id
  from public.crm_leads l
  where public.normalize_whatsapp_number(l.whatsapp) = normalized_phone
  order by l.updated_at desc, l.created_at desc
  limit 1;

  if v_lead_id is not null then return v_lead_id; end if;

  return public.admin_ingest_public_lead(
    coalesce(nullif(btrim(coalesce(p_display_name, '')), ''), normalized_phone),
    null,
    normalized_phone,
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
