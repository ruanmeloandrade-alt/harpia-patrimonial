-- Hárpia Patrimonial | F07 Integration Core
-- Normalização aditiva da Inbox e registro comum de integrações.
-- O estado legado em platform_module_state permanece intacto até o adapter normalizado ser validado.

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null default 'not_connected'
    check (status in ('not_connected','connecting','connected','degraded','reauth_required','error')),
  external_account_id text,
  account_label text,
  connected_at timestamptz,
  last_health_at timestamptz,
  last_event_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integration_connections_provider_account_uidx
  on public.integration_connections(provider, external_account_id)
  where external_account_id is not null;

create index if not exists integration_connections_provider_status_idx
  on public.integration_connections(provider, status);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.integration_connections(id) on delete set null,
  provider text not null,
  event_type text not null,
  external_id text,
  success boolean not null,
  attempt integer not null default 1 check (attempt > 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists integration_events_provider_occurred_idx
  on public.integration_events(provider, occurred_at desc);

create index if not exists integration_events_external_id_idx
  on public.integration_events(provider, external_id)
  where external_id is not null;

create table if not exists public.inbox_channel_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.integration_connections(id) on delete set null,
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','email','other')),
  provider text not null,
  external_account_id text,
  phone_number text,
  display_name text,
  status text not null default 'not_connected'
    check (status in ('not_connected','connecting','connected','degraded','reauth_required','error')),
  last_heartbeat_at timestamptz,
  last_event_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  connector_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inbox_channel_accounts_provider_account_uidx
  on public.inbox_channel_accounts(provider, external_account_id)
  where external_account_id is not null;

create index if not exists inbox_channel_accounts_status_idx
  on public.inbox_channel_accounts(status, last_heartbeat_at desc);

create table if not exists public.inbox_conversations (
  id text primary key,
  lead_id text not null,
  channel_account_id uuid references public.inbox_channel_accounts(id) on delete set null,
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','email','other')),
  provider text not null default 'legacy',
  external_thread_id text,
  transport_status text not null default 'not_connected'
    check (transport_status in ('not_connected','connected','error')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inbox_conversations_provider_thread_uidx
  on public.inbox_conversations(provider, external_thread_id)
  where external_thread_id is not null;

create index if not exists inbox_conversations_lead_idx
  on public.inbox_conversations(lead_id);

create index if not exists inbox_conversations_last_message_idx
  on public.inbox_conversations(last_message_at desc nulls last);

create table if not exists public.inbox_messages (
  id text primary key,
  conversation_id text not null references public.inbox_conversations(id) on delete cascade,
  provider text not null default 'legacy',
  direction text not null check (direction in ('inbound','outbound')),
  type text not null check (type in ('text','audio','image','video','document','form')),
  text_content text,
  form_payload jsonb,
  delivery_status text not null check (delivery_status in ('received','sent','failed','pending')),
  external_message_id text,
  provider_timestamp timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inbox_messages_provider_external_uidx
  on public.inbox_messages(provider, external_message_id)
  where external_message_id is not null;

create index if not exists inbox_messages_conversation_created_idx
  on public.inbox_messages(conversation_id, created_at);

create table if not exists public.inbox_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id text not null references public.inbox_messages(id) on delete cascade,
  name text,
  mime_type text,
  url text,
  storage_bucket text,
  storage_path text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  provider_media_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists inbox_message_attachments_message_uidx
  on public.inbox_message_attachments(message_id);

alter table public.integration_connections enable row level security;
alter table public.integration_events enable row level security;
alter table public.inbox_channel_accounts enable row level security;
alter table public.inbox_conversations enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.inbox_message_attachments enable row level security;

drop policy if exists "integration_connections_read" on public.integration_connections;
create policy "integration_connections_read"
  on public.integration_connections
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'integrations.view')
    or private.user_has_permission((select auth.uid()), 'integrations.manage')
  );

drop policy if exists "integration_events_read" on public.integration_events;
create policy "integration_events_read"
  on public.integration_events
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'integrations.view')
    or private.user_has_permission((select auth.uid()), 'integrations.manage')
  );

drop policy if exists "inbox_channel_accounts_read" on public.inbox_channel_accounts;
create policy "inbox_channel_accounts_read"
  on public.inbox_channel_accounts
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'integrations.view')
    or private.user_has_permission((select auth.uid()), 'integrations.manage')
    or private.user_has_permission((select auth.uid()), 'inbox.view')
    or private.user_has_permission((select auth.uid()), 'inbox.manage')
  );

drop policy if exists "inbox_conversations_read" on public.inbox_conversations;
create policy "inbox_conversations_read"
  on public.inbox_conversations
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'inbox.view')
    or private.user_has_permission((select auth.uid()), 'inbox.manage')
  );

drop policy if exists "inbox_conversations_insert" on public.inbox_conversations;
create policy "inbox_conversations_insert"
  on public.inbox_conversations
  for insert to authenticated
  with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_conversations_update" on public.inbox_conversations;
create policy "inbox_conversations_update"
  on public.inbox_conversations
  for update to authenticated
  using (private.user_has_permission((select auth.uid()), 'inbox.manage'))
  with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_conversations_delete" on public.inbox_conversations;
create policy "inbox_conversations_delete"
  on public.inbox_conversations
  for delete to authenticated
  using (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_messages_read" on public.inbox_messages;
create policy "inbox_messages_read"
  on public.inbox_messages
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'inbox.view')
    or private.user_has_permission((select auth.uid()), 'inbox.manage')
  );

drop policy if exists "inbox_messages_insert" on public.inbox_messages;
create policy "inbox_messages_insert"
  on public.inbox_messages
  for insert to authenticated
  with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_messages_update" on public.inbox_messages;
create policy "inbox_messages_update"
  on public.inbox_messages
  for update to authenticated
  using (private.user_has_permission((select auth.uid()), 'inbox.manage'))
  with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_messages_delete" on public.inbox_messages;
create policy "inbox_messages_delete"
  on public.inbox_messages
  for delete to authenticated
  using (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_message_attachments_read" on public.inbox_message_attachments;
create policy "inbox_message_attachments_read"
  on public.inbox_message_attachments
  for select to authenticated
  using (
    private.user_has_permission((select auth.uid()), 'inbox.view')
    or private.user_has_permission((select auth.uid()), 'inbox.manage')
  );

drop policy if exists "inbox_message_attachments_insert" on public.inbox_message_attachments;
create policy "inbox_message_attachments_insert"
  on public.inbox_message_attachments
  for insert to authenticated
  with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_message_attachments_update" on public.inbox_message_attachments;
create policy "inbox_message_attachments_update"
  on public.inbox_message_attachments
  for update to authenticated
  using (private.user_has_permission((select auth.uid()), 'inbox.manage'))
  with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

drop policy if exists "inbox_message_attachments_delete" on public.inbox_message_attachments;
create policy "inbox_message_attachments_delete"
  on public.inbox_message_attachments
  for delete to authenticated
  using (private.user_has_permission((select auth.uid()), 'inbox.manage'));

revoke all on public.integration_connections from anon, authenticated;
revoke all on public.integration_events from anon, authenticated;
revoke all on public.inbox_channel_accounts from anon, authenticated;
revoke all on public.inbox_conversations from anon, authenticated;
revoke all on public.inbox_messages from anon, authenticated;
revoke all on public.inbox_message_attachments from anon, authenticated;

grant select on public.integration_connections to authenticated;
grant select on public.integration_events to authenticated;
grant select on public.inbox_channel_accounts to authenticated;
grant select, insert, update, delete on public.inbox_conversations to authenticated;
grant select, insert, update, delete on public.inbox_messages to authenticated;
grant select, insert, update, delete on public.inbox_message_attachments to authenticated;

grant select, insert, update, delete on public.integration_connections to service_role;
grant select, insert, update, delete on public.integration_events to service_role;
grant select, insert, update, delete on public.inbox_channel_accounts to service_role;
grant select, insert, update, delete on public.inbox_conversations to service_role;
grant select, insert, update, delete on public.inbox_messages to service_role;
grant select, insert, update, delete on public.inbox_message_attachments to service_role;

insert into public.inbox_conversations (
  id, lead_id, channel, provider, external_thread_id, transport_status,
  last_message_at, created_at, updated_at
)
select
  conversation->>'id',
  conversation->>'leadId',
  coalesce(nullif(conversation->>'channel',''), 'whatsapp'),
  'legacy',
  nullif(conversation->>'externalThreadId',''),
  coalesce(nullif(conversation->>'transportStatus',''), 'not_connected'),
  case when nullif(conversation->>'lastMessageAt','') is null then null else (conversation->>'lastMessageAt')::timestamptz end,
  coalesce((conversation->>'createdAt')::timestamptz, now()),
  coalesce((conversation->>'updatedAt')::timestamptz, now())
from public.platform_module_state state_row,
lateral jsonb_array_elements(coalesce(state_row.state->'conversations','[]'::jsonb)) as conversation
where state_row.module = 'inbox'
  and nullif(conversation->>'id','') is not null
  and nullif(conversation->>'leadId','') is not null
on conflict (id) do nothing;

insert into public.inbox_messages (
  id, conversation_id, provider, direction, type, text_content, form_payload,
  delivery_status, external_message_id, provider_timestamp, created_at, updated_at
)
select
  message->>'id',
  message->>'conversationId',
  coalesce(conversation.provider, 'legacy'),
  message->>'direction',
  message->>'type',
  nullif(message->>'text',''),
  message->'formPayload',
  message->>'deliveryStatus',
  nullif(message->>'externalMessageId',''),
  null,
  coalesce((message->>'createdAt')::timestamptz, now()),
  coalesce((message->>'createdAt')::timestamptz, now())
from public.platform_module_state state_row
cross join lateral jsonb_array_elements(coalesce(state_row.state->'messages','[]'::jsonb)) as message
join public.inbox_conversations conversation
  on conversation.id = message->>'conversationId'
where state_row.module = 'inbox'
  and nullif(message->>'id','') is not null
on conflict (id) do nothing;

insert into public.inbox_message_attachments (
  message_id, name, mime_type, url, size_bytes
)
select
  message->>'id',
  nullif(message->'attachment'->>'name',''),
  nullif(message->'attachment'->>'mimeType',''),
  nullif(message->'attachment'->>'url',''),
  case
    when nullif(message->'attachment'->>'size','') is null then null
    else (message->'attachment'->>'size')::bigint
  end
from public.platform_module_state state_row
cross join lateral jsonb_array_elements(coalesce(state_row.state->'messages','[]'::jsonb)) as message
join public.inbox_messages normalized
  on normalized.id = message->>'id'
where state_row.module = 'inbox'
  and jsonb_typeof(message->'attachment') = 'object'
  and not exists (
    select 1
    from public.inbox_message_attachments existing
    where existing.message_id = message->>'id'
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inbox_conversations'
  ) then
    alter publication supabase_realtime add table public.inbox_conversations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inbox_messages'
  ) then
    alter publication supabase_realtime add table public.inbox_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inbox_message_attachments'
  ) then
    alter publication supabase_realtime add table public.inbox_message_attachments;
  end if;
end
$;
