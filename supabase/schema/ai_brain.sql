-- Cérebro compartilhado dos Agentes IA da Hárpia.
-- Fonte versionada do estado já aplicado no Supabase em 24/09/2026.

create table if not exists public.ai_brain_config (
  id boolean primary key default true check (id = true),
  company_context text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.user_profiles(id) on delete set null
);

insert into public.ai_brain_config (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.ai_brain_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('text', 'pdf', 'image')),
  title text not null,
  text_content text null,
  storage_bucket text null,
  storage_path text null,
  mime_type text null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  status text not null default 'ready' check (status in ('processing', 'ready', 'error')),
  error_message text null,
  created_by uuid null references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_brain_sources_created_at_idx
  on public.ai_brain_sources (created_at desc);

alter table public.ai_brain_config enable row level security;
alter table public.ai_brain_sources enable row level security;

grant select, update on public.ai_brain_config to authenticated;
grant select, insert, update, delete on public.ai_brain_sources to authenticated;

drop policy if exists ai_brain_config_read on public.ai_brain_config;
create policy ai_brain_config_read
on public.ai_brain_config
for select
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'ai.view')
  or private.user_has_permission((select auth.uid()), 'ai.manage')
);

drop policy if exists ai_brain_config_manage on public.ai_brain_config;
create policy ai_brain_config_manage
on public.ai_brain_config
for update
to authenticated
using (private.user_has_permission((select auth.uid()), 'ai.manage'))
with check (private.user_has_permission((select auth.uid()), 'ai.manage'));

drop policy if exists ai_brain_sources_read on public.ai_brain_sources;
create policy ai_brain_sources_read
on public.ai_brain_sources
for select
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'ai.view')
  or private.user_has_permission((select auth.uid()), 'ai.manage')
);

drop policy if exists ai_brain_sources_insert on public.ai_brain_sources;
create policy ai_brain_sources_insert
on public.ai_brain_sources
for insert
to authenticated
with check (private.user_has_permission((select auth.uid()), 'ai.manage'));

drop policy if exists ai_brain_sources_update on public.ai_brain_sources;
create policy ai_brain_sources_update
on public.ai_brain_sources
for update
to authenticated
using (private.user_has_permission((select auth.uid()), 'ai.manage'))
with check (private.user_has_permission((select auth.uid()), 'ai.manage'));

drop policy if exists ai_brain_sources_delete on public.ai_brain_sources;
create policy ai_brain_sources_delete
on public.ai_brain_sources
for delete
to authenticated
using (private.user_has_permission((select auth.uid()), 'ai.manage'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ai-brain',
  'ai-brain',
  false,
  10485760,
  array['application/pdf','text/plain','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ai_brain_storage_read on storage.objects;
create policy ai_brain_storage_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ai-brain'
  and (
    private.user_has_permission((select auth.uid()), 'ai.view')
    or private.user_has_permission((select auth.uid()), 'ai.manage')
  )
);

drop policy if exists ai_brain_storage_insert on storage.objects;
create policy ai_brain_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ai-brain'
  and private.user_has_permission((select auth.uid()), 'ai.manage')
);

drop policy if exists ai_brain_storage_update on storage.objects;
create policy ai_brain_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ai-brain'
  and private.user_has_permission((select auth.uid()), 'ai.manage')
)
with check (
  bucket_id = 'ai-brain'
  and private.user_has_permission((select auth.uid()), 'ai.manage')
);

drop policy if exists ai_brain_storage_delete on storage.objects;
create policy ai_brain_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ai-brain'
  and private.user_has_permission((select auth.uid()), 'ai.manage')
);
