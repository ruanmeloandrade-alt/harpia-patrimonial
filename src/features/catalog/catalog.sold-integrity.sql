-- Hárpia Patrimonial — Frente03 / integridade de empreendimentos vendidos
-- Aplicar após catalog.schema.sql em bancos já existentes.
-- Mantém unidade histórica editável, mas impede nova vinculação a pai vendido
-- e impede vender empreendimento enquanto houver unidade ativa não vendida.

create or replace function private.protect_catalog_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_kind public.catalog_item_kind;
  parent_status public.catalog_status;
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
    select ci.kind, ci.status into parent_kind, parent_status
    from public.catalog_items ci
    where ci.id = new.parent_id and ci.deleted_at is null;

    if parent_kind is distinct from 'development'::public.catalog_item_kind then
      raise exception 'catalog unit requires an active development parent';
    end if;

    if parent_status = 'sold'::public.catalog_status
       and not (old.kind = 'unit'::public.catalog_item_kind and old.parent_id = new.parent_id) then
      raise exception 'catalog unit cannot be linked to a sold development';
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

  if new.kind = 'development'::public.catalog_item_kind
     and new.status = 'sold'::public.catalog_status
     and old.status is distinct from new.status
     and exists (
       select 1 from public.catalog_items child
       where child.parent_id = new.id
         and child.deleted_at is null
         and child.status <> 'sold'::public.catalog_status
     ) then
    raise exception 'development has active unsold units';
  end if;

  if new.status is distinct from old.status then
    if not can_publish then
      raise exception 'catalog.publish permission required';
    end if;

    if old.status = 'sold'::public.catalog_status then
      raise exception 'sold catalog item is final and cannot change status';
    elsif old.status = 'draft'::public.catalog_status
          and new.status not in ('published'::public.catalog_status, 'sold'::public.catalog_status) then
      raise exception 'invalid catalog status transition: draft -> %', new.status;
    elsif old.status = 'published'::public.catalog_status
          and new.status not in ('paused'::public.catalog_status, 'sold'::public.catalog_status) then
      raise exception 'invalid catalog status transition: published -> %', new.status;
    elsif old.status = 'paused'::public.catalog_status
          and new.status not in ('published'::public.catalog_status, 'sold'::public.catalog_status) then
      raise exception 'invalid catalog status transition: paused -> %', new.status;
    end if;
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

create or replace function private.validate_catalog_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_kind public.catalog_item_kind;
  parent_status public.catalog_status;
begin
  if new.kind = 'unit' then
    select ci.kind, ci.status into parent_kind, parent_status
    from public.catalog_items ci
    where ci.id = new.parent_id and ci.deleted_at is null;

    if parent_kind is distinct from 'development'::public.catalog_item_kind then
      raise exception 'catalog unit requires an active development parent';
    end if;

    if parent_status = 'sold'::public.catalog_status then
      raise exception 'catalog unit cannot be linked to a sold development';
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
