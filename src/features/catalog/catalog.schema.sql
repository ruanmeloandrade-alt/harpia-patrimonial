-- Hárpia Patrimonial — Frente03 / catálogo imobiliário
-- Aplicar após o schema de autenticação/RBAC da Frente01.
-- Este arquivo usa private.user_has_permission(...) já definido pela Frente01.

create type public.catalog_item_kind as enum ('development', 'unit', 'standalone');
create type public.catalog_purpose as enum ('sale', 'rent');
create type public.catalog_status as enum ('draft', 'published', 'paused', 'sold');

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  kind public.catalog_item_kind not null,
  parent_id uuid references public.catalog_items(id) on delete restrict,
  typology text,
  purpose public.catalog_purpose not null,
  description text not null default '',
  city text not null,
  neighborhood text not null default '',
  condominium text,
  address text,
  price numeric(16,2) check (price is null or price >= 0),
  is_launch boolean not null default false,
  features text[] not null default '{}'::text[],
  lifestyle_tags text[] not null default '{}'::text[],
  developer text,
  media jsonb not null default '[]'::jsonb,
  status public.catalog_status not null default 'draft',
  published_at timestamptz,
  sold_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_code_not_blank check (nullif(btrim(code), '') is not null),
  constraint catalog_name_not_blank check (nullif(btrim(name), '') is not null),
  constraint catalog_city_not_blank check (nullif(btrim(city), '') is not null),
  constraint catalog_media_array_check check (jsonb_typeof(media) = 'array'),
  constraint catalog_unit_parent_check check (
    (kind = 'unit' and parent_id is not null)
    or (kind <> 'unit' and parent_id is null)
  ),
  constraint catalog_unit_typology_check check (
    kind <> 'unit' or nullif(btrim(typology), '') is not null
  ),
  constraint catalog_non_unit_typology_check check (
    kind = 'unit' or typology is null
  )
);

create unique index catalog_items_code_active_unique
on public.catalog_items (lower(code))
where deleted_at is null;

create index catalog_items_status_idx on public.catalog_items (status) where deleted_at is null;
create index catalog_items_parent_idx on public.catalog_items (parent_id) where deleted_at is null;
create index catalog_items_city_idx on public.catalog_items (city) where deleted_at is null;
create index catalog_items_purpose_idx on public.catalog_items (purpose) where deleted_at is null;

create trigger catalog_items_touch_updated_at
before update on public.catalog_items
for each row execute function private.touch_updated_at();

create or replace function private.protect_catalog_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_kind public.catalog_item_kind;
  is_service_role boolean;
  can_manage boolean;
  can_publish boolean;
begin
  is_service_role := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  can_manage := is_service_role or private.user_has_permission((select auth.uid()), 'catalog.manage');
  can_publish := is_service_role or private.user_has_permission((select auth.uid()), 'catalog.publish');

  if not can_manage and can_publish then
    if (to_jsonb(new) - array['status', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'updated_at']) then
      raise exception 'catalog.manage permission required for catalog data changes';
    end if;
  end if;

  if not is_service_role
     and new.published_at is distinct from old.published_at
     and not (new.status = 'published'::public.catalog_status and old.status is distinct from new.status) then
    raise exception 'published_at is managed by catalog status transitions';
  end if;

  if not is_service_role
     and new.sold_at is distinct from old.sold_at
     and not (new.status = 'sold'::public.catalog_status and old.status is distinct from new.status) then
    raise exception 'sold_at is managed by catalog status transitions';
  end if;

  if new.kind = 'unit' then
    select ci.kind into parent_kind
    from public.catalog_items ci
    where ci.id = new.parent_id and ci.deleted_at is null;

    if parent_kind is distinct from 'development'::public.catalog_item_kind then
      raise exception 'catalog unit requires an active development parent';
    end if;

    if nullif(btrim(new.typology), '') is null then
      raise exception 'catalog unit requires typology';
    end if;
  else
    new.parent_id = null;
    new.typology = null;
  end if;

  if old.kind = 'development'::public.catalog_item_kind
     and (
       new.kind is distinct from old.kind
       or (old.deleted_at is null and new.deleted_at is not null)
     )
     and exists (
       select 1 from public.catalog_items child
       where child.parent_id = old.id
         and child.deleted_at is null
     ) then
    raise exception 'development has active units';
  end if;

  if new.status is distinct from old.status and not can_publish then
    raise exception 'catalog.publish permission required';
  end if;

  if new.status = 'published'::public.catalog_status and old.status is distinct from new.status then
    new.published_at = coalesce(old.published_at, now());
  end if;

  if new.status = 'sold'::public.catalog_status and old.status is distinct from new.status then
    new.sold_at = coalesce(old.sold_at, now());
  end if;

  return new;
end;
$$;

revoke all on function private.protect_catalog_integrity() from public;
create trigger protect_catalog_integrity
before update on public.catalog_items
for each row execute function private.protect_catalog_integrity();

create or replace function private.validate_catalog_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_kind public.catalog_item_kind;
begin
  if new.kind = 'unit' then
    select ci.kind into parent_kind
    from public.catalog_items ci
    where ci.id = new.parent_id and ci.deleted_at is null;

    if parent_kind is distinct from 'development'::public.catalog_item_kind then
      raise exception 'catalog unit requires an active development parent';
    end if;

    if nullif(btrim(new.typology), '') is null then
      raise exception 'catalog unit requires typology';
    end if;
  else
    new.parent_id = null;
    new.typology = null;
  end if;

  if new.status <> 'draft'::public.catalog_status then
    raise exception 'new catalog items must start as draft';
  end if;

  new.published_at = null;
  new.sold_at = null;
  new.deleted_at = null;
  return new;
end;
$$;

revoke all on function private.validate_catalog_insert() from public;
create trigger validate_catalog_insert
before insert on public.catalog_items
for each row execute function private.validate_catalog_insert();

alter table public.catalog_items enable row level security;

create policy "catalog_public_read_published"
on public.catalog_items for select
to anon, authenticated
using (
  deleted_at is null
  and status = 'published'::public.catalog_status
);

create policy "catalog_internal_read"
on public.catalog_items for select
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'catalog.view')
  or private.user_has_permission((select auth.uid()), 'catalog.manage')
  or private.user_has_permission((select auth.uid()), 'catalog.publish')
);

create policy "catalog_internal_insert"
on public.catalog_items for insert
to authenticated
with check (private.user_has_permission((select auth.uid()), 'catalog.manage'));

create policy "catalog_internal_update"
on public.catalog_items for update
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'catalog.manage')
  or private.user_has_permission((select auth.uid()), 'catalog.publish')
)
with check (
  private.user_has_permission((select auth.uid()), 'catalog.manage')
  or private.user_has_permission((select auth.uid()), 'catalog.publish')
);

grant select on public.catalog_items to anon;
grant select, insert, update on public.catalog_items to authenticated;
grant select, insert, update, delete on public.catalog_items to service_role;
