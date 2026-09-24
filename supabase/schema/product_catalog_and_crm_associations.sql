-- Product catalog extension and CRM client-product relationship.
-- Applied to Supabase project desxomqvtjaymwwxivwq on 2026-09-24.

alter table public.catalog_items
  add column if not exists item_type text not null default 'property',
  add column if not exists discount_type text,
  add column if not exists discount_value numeric(16,2),
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.catalog_items
  drop constraint if exists catalog_city_not_blank;

alter table public.catalog_items
  alter column city drop not null,
  alter column city set default '';

alter table public.catalog_items
  add constraint catalog_item_type_check
    check (item_type in ('property','product','service')),
  add constraint catalog_city_required_for_property
    check (
      item_type <> 'property'
      or nullif(btrim(coalesce(city, '')), '') is not null
    ),
  add constraint catalog_discount_check
    check (
      (discount_type is null and discount_value is null)
      or (
        discount_type in ('percentage','fixed')
        and discount_value is not null
        and discount_value >= 0
        and (discount_type <> 'percentage' or discount_value <= 100)
      )
    );

create index if not exists catalog_items_item_type_idx
  on public.catalog_items (item_type)
  where deleted_at is null;

create index if not exists catalog_items_tags_gin_idx
  on public.catalog_items using gin (tags);

create table if not exists public.crm_lead_products (
  lead_id text not null references public.crm_leads(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  relationship text not null default 'interest'
    check (relationship in ('interest','quoted','purchased')),
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(16,2) check (unit_price is null or unit_price >= 0),
  discount_type text,
  discount_value numeric(16,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lead_id, catalog_item_id),
  constraint crm_lead_products_discount_check
    check (
      (discount_type is null and discount_value is null)
      or (
        discount_type in ('percentage','fixed')
        and discount_value is not null
        and discount_value >= 0
        and (discount_type <> 'percentage' or discount_value <= 100)
      )
    )
);

create index if not exists crm_lead_products_catalog_item_idx
  on public.crm_lead_products (catalog_item_id);

create index if not exists crm_lead_products_relationship_idx
  on public.crm_lead_products (relationship);

drop trigger if exists crm_lead_products_touch_updated_at on public.crm_lead_products;
create trigger crm_lead_products_touch_updated_at
before update on public.crm_lead_products
for each row execute function private.touch_updated_at();

alter table public.crm_lead_products enable row level security;

revoke all on table public.crm_lead_products from anon;
grant select, insert, update, delete on table public.crm_lead_products to authenticated;
grant select, insert, update, delete on table public.crm_lead_products to service_role;

drop policy if exists crm_lead_products_read on public.crm_lead_products;
create policy crm_lead_products_read
on public.crm_lead_products
for select
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'crm.view')
  or private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists crm_lead_products_insert on public.crm_lead_products;
create policy crm_lead_products_insert
on public.crm_lead_products
for insert
to authenticated
with check (
  private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists crm_lead_products_update on public.crm_lead_products;
create policy crm_lead_products_update
on public.crm_lead_products
for update
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'crm.manage')
)
with check (
  private.user_has_permission((select auth.uid()), 'crm.manage')
);

drop policy if exists crm_lead_products_delete on public.crm_lead_products;
create policy crm_lead_products_delete
on public.crm_lead_products
for delete
to authenticated
using (
  private.user_has_permission((select auth.uid()), 'crm.manage')
);
