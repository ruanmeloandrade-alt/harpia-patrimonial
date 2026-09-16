-- Hárpia Patrimonial — Frente04 / CRM + Inbox
-- Aplicar somente no projeto Supabase dedicado da Hárpia.
-- Aplicar depois de supabase/schema/core_auth.sql da Frente01.
-- Este schema depende de private.user_has_permission(...) e private.touch_updated_at().
--
-- Os IDs das entidades CRM/Inbox são TEXT por compatibilidade com o domínio atual
-- (`pipeline_<uuid>`, `lead_<uuid>`, `conversation_<uuid>` etc.). IDs de usuários
-- continuam UUID por referenciarem public.user_profiles.
--
-- Segurança:
-- - anon NÃO recebe acesso direto às tabelas CRM/Inbox.
-- - conversões do site público devem entrar por backend/Edge Function controlada,
--   nunca por INSERT anon direto em crm_leads.
-- - transporte de mensagens deve escrever inbox_messages via backend/service_role;
--   usuário autenticado apenas lê mensagens e cria contexto interno de conversa.

create type public.crm_interest_type as enum ('property', 'product', 'service', 'other');
create type public.crm_custom_field_type as enum ('text', 'number', 'date', 'boolean', 'select', 'multiselect');
create type public.crm_task_status as enum ('pending', 'done', 'cancelled');
create type public.inbox_channel as enum ('whatsapp', 'email', 'other');
create type public.inbox_transport_status as enum ('not_connected', 'connected', 'error');
create type public.inbox_message_direction as enum ('inbound', 'outbound');
create type public.inbox_message_type as enum ('text', 'audio', 'image', 'video', 'document', 'form');
create type public.inbox_delivery_status as enum ('received', 'sent', 'failed', 'pending');

create table public.crm_pipelines (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_pipeline_name_not_blank check (nullif(btrim(name), '') is not null)
);

create table public.crm_stages (
  id text primary key default gen_random_uuid()::text,
  pipeline_id text not null references public.crm_pipelines(id) on delete restrict,
  name text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_stage_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_stage_name_not_blank check (nullif(btrim(name), '') is not null)
);

create table public.crm_leads (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text,
  whatsapp text,
  source text,
  source_action text,
  source_page text,
  source_occurred_at timestamptz,
  source_metadata jsonb not null default '{}'::jsonb,
  interest_type public.crm_interest_type,
  interest_reference_id text,
  interest_label text,
  assignee_id uuid references public.user_profiles(id) on delete set null,
  pipeline_id text references public.crm_pipelines(id) on delete restrict,
  stage_id text references public.crm_stages(id) on delete restrict,
  notes text,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_lead_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_lead_name_not_blank check (nullif(btrim(name), '') is not null),
  constraint crm_lead_source_metadata_object check (jsonb_typeof(source_metadata) = 'object')
);

create table public.crm_tags (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tag_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_tag_name_not_blank check (nullif(btrim(name), '') is not null)
);

create unique index crm_tags_name_unique on public.crm_tags (lower(btrim(name)));

create table public.crm_lead_tags (
  lead_id text not null references public.crm_leads(id) on delete cascade,
  tag_id text not null references public.crm_tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create table public.crm_custom_field_definitions (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  field_type public.crm_custom_field_type not null,
  options jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_custom_field_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_custom_field_name_not_blank check (nullif(btrim(name), '') is not null),
  constraint crm_custom_field_options_array check (jsonb_typeof(options) = 'array')
);

create table public.crm_lead_custom_field_values (
  lead_id text not null references public.crm_leads(id) on delete cascade,
  field_id text not null references public.crm_custom_field_definitions(id) on delete restrict,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lead_id, field_id)
);

create table public.crm_tasks (
  id text primary key default gen_random_uuid()::text,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.user_profiles(id) on delete set null,
  due_at timestamptz,
  status public.crm_task_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_task_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_task_title_not_blank check (nullif(btrim(title), '') is not null)
);

create table public.crm_lead_history (
  id text primary key default gen_random_uuid()::text,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  event_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint crm_history_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint crm_history_type_not_blank check (nullif(btrim(event_type), '') is not null),
  constraint crm_history_description_not_blank check (nullif(btrim(description), '') is not null),
  constraint crm_history_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.inbox_conversations (
  id text primary key default gen_random_uuid()::text,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  channel public.inbox_channel not null default 'whatsapp',
  transport_status public.inbox_transport_status not null default 'not_connected',
  external_thread_id text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inbox_conversation_id_not_blank check (nullif(btrim(id), '') is not null),
  unique (lead_id, channel)
);

create table public.inbox_messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references public.inbox_conversations(id) on delete cascade,
  direction public.inbox_message_direction not null,
  message_type public.inbox_message_type not null,
  text_content text,
  attachment jsonb,
  form_payload jsonb,
  delivery_status public.inbox_delivery_status not null,
  external_message_id text,
  created_at timestamptz not null default now(),
  constraint inbox_message_id_not_blank check (nullif(btrim(id), '') is not null),
  constraint inbox_attachment_object check (attachment is null or jsonb_typeof(attachment) = 'object'),
  constraint inbox_form_payload_object check (form_payload is null or jsonb_typeof(form_payload) = 'object')
);

create unique index inbox_messages_external_id_unique
on public.inbox_messages (external_message_id)
where external_message_id is not null;

create index crm_stages_pipeline_position_idx on public.crm_stages (pipeline_id, position);
create index crm_leads_pipeline_stage_idx on public.crm_leads (pipeline_id, stage_id);
create index crm_leads_assignee_idx on public.crm_leads (assignee_id);
create index crm_leads_interest_reference_idx on public.crm_leads (interest_reference_id) where interest_reference_id is not null;
create index crm_leads_source_idx on public.crm_leads (source) where source is not null;
create index crm_tasks_lead_status_due_idx on public.crm_tasks (lead_id, status, due_at);
create index crm_history_lead_created_idx on public.crm_lead_history (lead_id, created_at desc);
create index inbox_conversations_lead_idx on public.inbox_conversations (lead_id);
create index inbox_conversations_last_message_idx on public.inbox_conversations (last_message_at desc nulls last);
create index inbox_messages_conversation_created_idx on public.inbox_messages (conversation_id, created_at);

create trigger crm_pipelines_touch_updated_at before update on public.crm_pipelines
for each row execute function private.touch_updated_at();
create trigger crm_stages_touch_updated_at before update on public.crm_stages
for each row execute function private.touch_updated_at();
create trigger crm_leads_touch_updated_at before update on public.crm_leads
for each row execute function private.touch_updated_at();
create trigger crm_tags_touch_updated_at before update on public.crm_tags
for each row execute function private.touch_updated_at();
create trigger crm_custom_field_definitions_touch_updated_at before update on public.crm_custom_field_definitions
for each row execute function private.touch_updated_at();
create trigger crm_lead_custom_field_values_touch_updated_at before update on public.crm_lead_custom_field_values
for each row execute function private.touch_updated_at();
create trigger crm_tasks_touch_updated_at before update on public.crm_tasks
for each row execute function private.touch_updated_at();
create trigger inbox_conversations_touch_updated_at before update on public.inbox_conversations
for each row execute function private.touch_updated_at();

create or replace function private.crm_validate_lead_placement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  resolved_pipeline_id text;
begin
  if new.stage_id is null then return new; end if;
  select stage.pipeline_id into resolved_pipeline_id
  from public.crm_stages stage where stage.id = new.stage_id;
  if resolved_pipeline_id is null then raise exception 'CRM stage not found'; end if;
  if new.pipeline_id is null then
    new.pipeline_id := resolved_pipeline_id;
  elsif new.pipeline_id is distinct from resolved_pipeline_id then
    raise exception 'CRM stage does not belong to selected pipeline';
  end if;
  return new;
end;
$$;
revoke all on function private.crm_validate_lead_placement() from public;
create trigger crm_validate_lead_placement
before insert or update of pipeline_id, stage_id on public.crm_leads
for each row execute function private.crm_validate_lead_placement();

create or replace function private.inbox_protect_internal_conversation_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    new.transport_status := 'not_connected'::public.inbox_transport_status;
    new.external_thread_id := null;
    new.last_message_at := null;
  end if;
  return new;
end;
$$;
revoke all on function private.inbox_protect_internal_conversation_insert() from public;
create trigger inbox_protect_internal_conversation_insert
before insert on public.inbox_conversations
for each row execute function private.inbox_protect_internal_conversation_insert();

alter table public.crm_pipelines enable row level security;
alter table public.crm_stages enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_lead_tags enable row level security;
alter table public.crm_custom_field_definitions enable row level security;
alter table public.crm_lead_custom_field_values enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_lead_history enable row level security;
alter table public.inbox_conversations enable row level security;
alter table public.inbox_messages enable row level security;

-- CRM: leitura é permitida a usuários que enxergam CRM ou Inbox,
-- pois a Inbox obrigatoriamente exibe contexto do lead.
create policy "crm_pipelines_select_authorized" on public.crm_pipelines for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_stages_select_authorized" on public.crm_stages for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_leads_select_authorized" on public.crm_leads for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_tags_select_authorized" on public.crm_tags for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_lead_tags_select_authorized" on public.crm_lead_tags for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_custom_fields_select_authorized" on public.crm_custom_field_definitions for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_custom_values_select_authorized" on public.crm_lead_custom_field_values for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_tasks_select_authorized" on public.crm_tasks for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "crm_history_select_authorized" on public.crm_lead_history for select to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.view') or private.user_has_permission((select auth.uid()), 'crm.manage') or private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));

-- CRM: mutações exigem crm.manage. inbox.manage isoladamente não vira
-- permissão genérica para alterar qualquer coluna do CRM.
create policy "crm_pipelines_insert_manage" on public.crm_pipelines for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_pipelines_update_manage" on public.crm_pipelines for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_stages_insert_manage" on public.crm_stages for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_stages_update_manage" on public.crm_stages for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_stages_delete_manage" on public.crm_stages for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_leads_insert_manage" on public.crm_leads for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_leads_update_manage" on public.crm_leads for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_tags_insert_manage" on public.crm_tags for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_tags_update_manage" on public.crm_tags for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_tags_delete_manage" on public.crm_tags for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_lead_tags_insert_manage" on public.crm_lead_tags for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_lead_tags_delete_manage" on public.crm_lead_tags for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_custom_fields_insert_manage" on public.crm_custom_field_definitions for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_custom_fields_update_manage" on public.crm_custom_field_definitions for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_custom_fields_delete_manage" on public.crm_custom_field_definitions for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_custom_values_insert_manage" on public.crm_lead_custom_field_values for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_custom_values_update_manage" on public.crm_lead_custom_field_values for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_custom_values_delete_manage" on public.crm_lead_custom_field_values for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_tasks_insert_manage" on public.crm_tasks for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_tasks_update_manage" on public.crm_tasks for update to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage')) with check (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_tasks_delete_manage" on public.crm_tasks for delete to authenticated
using (private.user_has_permission((select auth.uid()), 'crm.manage'));
create policy "crm_history_insert_manage" on public.crm_lead_history for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'crm.manage'));

-- Inbox: leitura exige inbox.view ou inbox.manage.
create policy "inbox_conversations_select_authorized" on public.inbox_conversations for select to authenticated
using (private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));
create policy "inbox_messages_select_authorized" on public.inbox_messages for select to authenticated
using (private.user_has_permission((select auth.uid()), 'inbox.view') or private.user_has_permission((select auth.uid()), 'inbox.manage'));

-- Usuário interno pode abrir somente contexto local; trigger força canal não conectado.
create policy "inbox_conversations_insert_manage" on public.inbox_conversations for insert to authenticated
with check (private.user_has_permission((select auth.uid()), 'inbox.manage'));

-- Atualização de transporte/conversa e escrita de mensagens ficam no backend/service_role.
-- Isso impede que o navegador marque mensagem como enviada sem transporte real.

-- Data API: retirar privilégios implícitos e conceder somente a superfície necessária.
revoke all on table public.crm_pipelines from anon, authenticated;
revoke all on table public.crm_stages from anon, authenticated;
revoke all on table public.crm_leads from anon, authenticated;
revoke all on table public.crm_tags from anon, authenticated;
revoke all on table public.crm_lead_tags from anon, authenticated;
revoke all on table public.crm_custom_field_definitions from anon, authenticated;
revoke all on table public.crm_lead_custom_field_values from anon, authenticated;
revoke all on table public.crm_tasks from anon, authenticated;
revoke all on table public.crm_lead_history from anon, authenticated;
revoke all on table public.inbox_conversations from anon, authenticated;
revoke all on table public.inbox_messages from anon, authenticated;

grant select, insert, update on table public.crm_pipelines to authenticated;
grant select, insert, update, delete on table public.crm_stages to authenticated;
grant select, insert, update on table public.crm_leads to authenticated;
grant select, insert, update, delete on table public.crm_tags to authenticated;
grant select, insert, delete on table public.crm_lead_tags to authenticated;
grant select, insert, update, delete on table public.crm_custom_field_definitions to authenticated;
grant select, insert, update, delete on table public.crm_lead_custom_field_values to authenticated;
grant select, insert, update, delete on table public.crm_tasks to authenticated;
grant select, insert on table public.crm_lead_history to authenticated;
grant select, insert on table public.inbox_conversations to authenticated;
grant select on table public.inbox_messages to authenticated;

revoke all on table public.crm_pipelines from service_role;
revoke all on table public.crm_stages from service_role;
revoke all on table public.crm_leads from service_role;
revoke all on table public.crm_tags from service_role;
revoke all on table public.crm_lead_tags from service_role;
revoke all on table public.crm_custom_field_definitions from service_role;
revoke all on table public.crm_lead_custom_field_values from service_role;
revoke all on table public.crm_tasks from service_role;
revoke all on table public.crm_lead_history from service_role;
revoke all on table public.inbox_conversations from service_role;
revoke all on table public.inbox_messages from service_role;

grant select, insert, update, delete on table public.crm_pipelines to service_role;
grant select, insert, update, delete on table public.crm_stages to service_role;
grant select, insert, update, delete on table public.crm_leads to service_role;
grant select, insert, update, delete on table public.crm_tags to service_role;
grant select, insert, update, delete on table public.crm_lead_tags to service_role;
grant select, insert, update, delete on table public.crm_custom_field_definitions to service_role;
grant select, insert, update, delete on table public.crm_lead_custom_field_values to service_role;
grant select, insert, update, delete on table public.crm_tasks to service_role;
grant select, insert, update, delete on table public.crm_lead_history to service_role;
grant select, insert, update, delete on table public.inbox_conversations to service_role;
grant select, insert, update, delete on table public.inbox_messages to service_role;
