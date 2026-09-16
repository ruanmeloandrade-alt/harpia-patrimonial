-- Hárpia Patrimonial — Frente03 / validação de payload de mídia
-- Aplicar após catalog.schema.sql.
-- Protege chamadas diretas à Data API contra tipos inválidos e URLs fora de HTTP(S).

create or replace function private.validate_catalog_media_payload()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  media_type text;
  media_id text;
  media_url text;
begin
  if jsonb_typeof(new.media) is distinct from 'array' then
    raise exception 'catalog media must be an array';
  end if;

  for item in select value from jsonb_array_elements(new.media)
  loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'catalog media item must be an object';
    end if;

    media_id := nullif(btrim(item ->> 'id'), '');
    media_type := item ->> 'type';
    media_url := nullif(btrim(item ->> 'url'), '');

    if media_id is null then
      raise exception 'catalog media item requires id';
    end if;

    if media_type not in ('image', 'video', 'document', 'floorplan') then
      raise exception 'catalog media type is invalid';
    end if;

    if media_url is null or media_url !~* '^https?://[^[:space:]]+$' then
      raise exception 'catalog media url must use http or https';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.validate_catalog_media_payload() from public;

drop trigger if exists validate_catalog_media_payload on public.catalog_items;
create trigger validate_catalog_media_payload
before insert or update of media on public.catalog_items
for each row execute function private.validate_catalog_media_payload();
