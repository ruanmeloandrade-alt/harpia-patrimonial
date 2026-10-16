-- Hárpia Portal do Cliente — preferências, documentos e storage privado
-- Aplicado no Supabase em 16/10/2026 como migration client_portal_private_area.

create table if not exists public.client_portal_preferences (
  client_id uuid primary key references public.user_profiles(id) on delete cascade,
  objective text,
  property_types text[] not null default '{}',
  neighborhoods text[] not null default '{}',
  investment_range text,
  priorities text[] not null default '{}',
  city text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.user_profiles(id) on delete cascade,
  lead_id text references public.crm_leads(id) on delete set null,
  request_label text not null default 'Documento',
  description text,
  status text not null default 'received'
    check (status in ('requested','received','review','approved')),
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_documents_client_updated_idx
  on public.client_documents(client_id, updated_at desc);
create index if not exists client_documents_lead_idx
  on public.client_documents(lead_id) where lead_id is not null;

alter table public.client_portal_preferences enable row level security;
alter table public.client_documents enable row level security;

drop policy if exists client_portal_preferences_select on public.client_portal_preferences;
create policy client_portal_preferences_select
on public.client_portal_preferences for select to authenticated
using (
  client_id = (select auth.uid())
  or private.user_has_permission((select auth.uid()), 'crm.view')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists client_portal_preferences_insert on public.client_portal_preferences;
create policy client_portal_preferences_insert
on public.client_portal_preferences for insert to authenticated
with check (
  client_id = (select auth.uid())
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists client_portal_preferences_update on public.client_portal_preferences;
create policy client_portal_preferences_update
on public.client_portal_preferences for update to authenticated
using (
  client_id = (select auth.uid())
  or private.user_has_permission((select auth.uid()), 'crm.manage')
)
with check (
  client_id = (select auth.uid())
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists client_documents_select on public.client_documents;
create policy client_documents_select
on public.client_documents for select to authenticated
using (
  client_id = (select auth.uid())
  or private.user_has_permission((select auth.uid()), 'crm.view')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists client_documents_insert on public.client_documents;
create policy client_documents_insert
on public.client_documents for insert to authenticated
with check (
  (client_id = (select auth.uid()) and status = 'received')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists client_documents_update on public.client_documents;
create policy client_documents_update
on public.client_documents for update to authenticated
using (
  (client_id = (select auth.uid()) and status = 'requested')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
)
with check (
  (client_id = (select auth.uid()) and status = 'received')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists client_documents_delete on public.client_documents;
create policy client_documents_delete
on public.client_documents for delete to authenticated
using (
  (client_id = (select auth.uid()) and status = 'received')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

grant select, insert, update on public.client_portal_preferences to authenticated;
grant select, insert, update, delete on public.client_documents to authenticated;
grant select, insert, update, delete on public.client_portal_preferences to service_role;
grant select, insert, update, delete on public.client_documents to service_role;

create or replace function private.touch_client_portal_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_portal_preferences_touch on public.client_portal_preferences;
create trigger client_portal_preferences_touch
before update on public.client_portal_preferences
for each row execute function private.touch_client_portal_updated_at();

drop trigger if exists client_documents_touch on public.client_documents;
create trigger client_documents_touch
before update on public.client_documents
for each row execute function private.touch_client_portal_updated_at();

create or replace function private.protect_client_document_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_is_internal boolean := false;
begin
  if caller is null then return new; end if;

  select exists(
    select 1
    from public.user_profiles
    where id = caller
      and account_type = 'internal'
      and is_active = true
  ) into caller_is_internal;

  if not caller_is_internal and caller = old.client_id then
    if old.status <> 'requested' then
      raise exception 'client document cannot be modified in this status';
    end if;

    new.client_id := old.client_id;
    new.lead_id := old.lead_id;
    new.request_label := old.request_label;
    new.description := old.description;
    new.created_at := old.created_at;
    new.status := 'received';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_client_document_update on public.client_documents;
create trigger protect_client_document_update
before update on public.client_documents
for each row execute function private.protect_client_document_update();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists client_documents_storage_select on storage.objects;
create policy client_documents_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'client-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.user_has_permission((select auth.uid()), 'crm.view')
    or private.user_has_permission((select auth.uid()), 'crm.manage')
  )
);

drop policy if exists client_documents_storage_insert on storage.objects;
create policy client_documents_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists client_documents_storage_update on storage.objects;
create policy client_documents_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'client-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.user_has_permission((select auth.uid()), 'crm.manage')
  )
)
with check (
  bucket_id = 'client-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.user_has_permission((select auth.uid()), 'crm.manage')
  )
);

drop policy if exists client_documents_storage_delete on storage.objects;
create policy client_documents_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'client-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.user_has_permission((select auth.uid()), 'crm.manage')
  )
);
