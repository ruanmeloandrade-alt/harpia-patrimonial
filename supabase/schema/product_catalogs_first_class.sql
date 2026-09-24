-- Catálogos definidos pelo cliente antes do cadastro de produtos.
-- Aplicado no projeto Supabase Hárpia em 2026-09-24.

create table if not exists public.product_catalogs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tags text[] not null default '{}'::text[],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.product_catalogs
  drop constraint if exists product_catalogs_name_not_blank;

alter table public.product_catalogs
  add constraint product_catalogs_name_not_blank
  check (nullif(btrim(name), '') is not null);

create unique index if not exists product_catalogs_name_unique_active
  on public.product_catalogs (lower(btrim(name)))
  where deleted_at is null;

create index if not exists product_catalogs_active_sort_idx
  on public.product_catalogs (is_active, sort_order, created_at)
  where deleted_at is null;

drop trigger if exists product_catalogs_touch_updated_at on public.product_catalogs;
create trigger product_catalogs_touch_updated_at
before update on public.product_catalogs
for each row execute function private.touch_updated_at();

alter table public.product_catalogs enable row level security;

revoke all on table public.product_catalogs from anon;
grant select, insert, update, delete on table public.product_catalogs to authenticated;
grant select, insert, update, delete on table public.product_catalogs to service_role;

drop policy if exists product_catalogs_read on public.product_catalogs;
create policy product_catalogs_read
on public.product_catalogs
for select
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'catalog.view')
  or private.user_has_permission((select auth.uid()), 'catalog.manage')
  or private.user_has_permission((select auth.uid()), 'catalog.publish')
);

drop policy if exists product_catalogs_insert on public.product_catalogs;
create policy product_catalogs_insert
on public.product_catalogs
for insert
to authenticated
with check (
  private.user_has_permission((select auth.uid()), 'catalog.manage')
);

drop policy if exists product_catalogs_update on public.product_catalogs;
create policy product_catalogs_update
on public.product_catalogs
for update
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'catalog.manage')
)
with check (
  private.user_has_permission((select auth.uid()), 'catalog.manage')
);

drop policy if exists product_catalogs_delete on public.product_catalogs;
create policy product_catalogs_delete
on public.product_catalogs
for delete
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'catalog.manage')
);

alter table public.catalog_items
  add column if not exists catalog_id uuid references public.product_catalogs(id) on delete restrict;

create index if not exists catalog_items_catalog_id_idx
  on public.catalog_items (catalog_id)
  where deleted_at is null;

alter table public.catalog_items
  drop constraint if exists catalog_item_type_check;

alter table public.catalog_items
  alter column item_type drop not null,
  alter column item_type drop default;

alter table public.catalog_items
  alter column catalog_id set not null;
