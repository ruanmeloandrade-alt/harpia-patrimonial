-- Hárpia Patrimonial & Co. — favoritos do cliente final
-- Aplicar somente no projeto Supabase dedicado da Hárpia.
-- Depende de public.user_profiles criado pela Frente01.

create table if not exists public.client_favorites (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  item_id text not null check (btrim(item_id) <> ''),
  item_slug text not null check (btrim(item_slug) <> ''),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.client_favorites enable row level security;

-- Projetos Supabase recentes podem não expor novas tabelas ao Data API por padrão.
-- A experiência pública precisa somente de leitura, criação e remoção pelo usuário autenticado.
revoke all on table public.client_favorites from anon;
grant select, insert, delete on table public.client_favorites to authenticated;
grant select, insert, update, delete on table public.client_favorites to service_role;

create policy "client_favorites_select_own"
on public.client_favorites for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

create policy "client_favorites_insert_own"
on public.client_favorites for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

create policy "client_favorites_delete_own"
on public.client_favorites for delete
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);
