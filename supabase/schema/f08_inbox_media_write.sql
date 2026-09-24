-- Hárpia Patrimonial | F08
-- Escrita de mídia privada permitida somente para operadores com gestão da Inbox.

drop policy if exists "inbox_media_insert" on storage.objects;
create policy "inbox_media_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inbox-media'
  and private.user_has_permission((select auth.uid()), 'inbox.manage')
);

drop policy if exists "inbox_media_update" on storage.objects;
create policy "inbox_media_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inbox-media'
  and private.user_has_permission((select auth.uid()), 'inbox.manage')
)
with check (
  bucket_id = 'inbox-media'
  and private.user_has_permission((select auth.uid()), 'inbox.manage')
);

drop policy if exists "inbox_media_delete" on storage.objects;
create policy "inbox_media_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inbox-media'
  and private.user_has_permission((select auth.uid()), 'inbox.manage')
);
