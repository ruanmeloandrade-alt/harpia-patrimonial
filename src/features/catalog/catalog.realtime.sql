-- Hárpia Patrimonial — Frente03 / Realtime do catálogo
-- Aplicar após catalog.schema.sql.
-- Permite que sessões internas abertas recebam mudanças de catalog_items sem polling.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'catalog_items'
  ) then
    alter publication supabase_realtime add table public.catalog_items;
  end if;
end
$$;
