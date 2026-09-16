-- Hárpia Patrimonial — favoritos persistidos do cliente
-- Aplicar após core_auth e catalog_front03.

create table if not exists public.client_favorites (
  client_id uuid not null references public.user_profiles(id) on delete cascade,
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  item_slug text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, item_id)
);

create index if not exists client_favorites_item_idx on public.client_favorites(item_id);

alter table public.client_favorites enable row level security;

drop policy if exists "client_favorites_select_own" on public.client_favorites;
create policy "client_favorites_select_own"
on public.client_favorites for select to authenticated
using (client_id = (select auth.uid()));

drop policy if exists "client_favorites_insert_own" on public.client_favorites;
create policy "client_favorites_insert_own"
on public.client_favorites for insert to authenticated
with check (
  client_id = (select auth.uid())
  and exists (
    select 1 from public.user_profiles up
    where up.id = (select auth.uid())
      and up.account_type = 'client'
      and up.is_active = true
  )
  and exists (
    select 1 from public.catalog_items ci
    where ci.id = item_id
      and ci.deleted_at is null
      and ci.status = 'published'::public.catalog_status
  )
);

drop policy if exists "client_favorites_delete_own" on public.client_favorites;
create policy "client_favorites_delete_own"
on public.client_favorites for delete to authenticated
using (client_id = (select auth.uid()));

grant select, insert, delete on public.client_favorites to authenticated;
grant select, insert, update, delete on public.client_favorites to service_role;
