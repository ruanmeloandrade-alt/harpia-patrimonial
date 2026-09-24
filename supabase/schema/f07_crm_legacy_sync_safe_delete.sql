-- Hárpia Patrimonial | F07
-- Evita que a sincronização legado -> CRM normalizado seja abortada pelo
-- safe-update do Postgres ao limpar relações antes de reconstruí-las.
do $$
declare
  fn text;
begin
  if to_regprocedure('private.sync_crm_normalized_from_legacy()') is null then
    return;
  end if;

  select pg_get_functiondef('private.sync_crm_normalized_from_legacy()'::regprocedure) into fn;
  fn := replace(fn, 'delete from public.crm_lead_tags;', 'delete from public.crm_lead_tags where true;');
  fn := replace(fn, 'delete from public.crm_lead_custom_field_values;', 'delete from public.crm_lead_custom_field_values where true;');
  execute fn;
end
$$;
