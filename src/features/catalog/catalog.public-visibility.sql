-- Hárpia Patrimonial — Frente03 / visibilidade pública hierárquica
-- Aplicar após catalog.schema.sql.
-- Garante que unidade só seja pública quando o empreendimento pai também estiver publicado.

create or replace function private.catalog_parent_is_published(p_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.catalog_items parent
    where parent.id = p_parent_id
      and parent.kind = 'development'::public.catalog_item_kind
      and parent.status = 'published'::public.catalog_status
      and parent.deleted_at is null
  );
$$;

revoke all on function private.catalog_parent_is_published(uuid) from public;
grant usage on schema private to anon;
grant execute on function private.catalog_parent_is_published(uuid) to anon, authenticated;

drop policy if exists "catalog_public_read_published" on public.catalog_items;
create policy "catalog_public_read_published"
on public.catalog_items for select
to anon
using (
  deleted_at is null
  and status = 'published'::public.catalog_status
  and (
    kind <> 'unit'::public.catalog_item_kind
    or private.catalog_parent_is_published(parent_id)
  )
);

drop policy if exists "catalog_authenticated_read" on public.catalog_items;
create policy "catalog_authenticated_read"
on public.catalog_items for select
to authenticated
using (
  (
    deleted_at is null
    and status = 'published'::public.catalog_status
    and (
      kind <> 'unit'::public.catalog_item_kind
      or private.catalog_parent_is_published(parent_id)
    )
  )
  or private.user_has_permission((select auth.uid()), 'catalog.view')
  or private.user_has_permission((select auth.uid()), 'catalog.manage')
  or private.user_has_permission((select auth.uid()), 'catalog.publish')
);
