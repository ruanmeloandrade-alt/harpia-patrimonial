-- Hárpia Patrimonial — Frente03 / Storage de mídia do catálogo
-- Aplicar somente no projeto Supabase dedicado da Hárpia e após core_auth.sql.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'catalog-media',
  'catalog-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalog_media_manage_select" on storage.objects;
create policy "catalog_media_manage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'catalog-media'
  and private.user_has_permission((select auth.uid()), 'catalog.manage')
);

drop policy if exists "catalog_media_manage_insert" on storage.objects;
create policy "catalog_media_manage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'catalog-media'
  and private.user_has_permission((select auth.uid()), 'catalog.manage')
);

drop policy if exists "catalog_media_manage_update" on storage.objects;
create policy "catalog_media_manage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'catalog-media'
  and private.user_has_permission((select auth.uid()), 'catalog.manage')
)
with check (
  bucket_id = 'catalog-media'
  and private.user_has_permission((select auth.uid()), 'catalog.manage')
);

drop policy if exists "catalog_media_manage_delete" on storage.objects;
create policy "catalog_media_manage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'catalog-media'
  and private.user_has_permission((select auth.uid()), 'catalog.manage')
);
