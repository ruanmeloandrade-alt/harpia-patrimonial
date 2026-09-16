-- Hárpia Patrimonial — Frente05
-- Hardening da escrita do estado compartilhado.
-- O RPC público deixa de executar como SECURITY DEFINER. A elevação necessária
-- fica em função do schema privado, fora do Data API exposto.

revoke execute on function public.save_f05_shared_storage(text, jsonb, bigint) from anon;

create or replace function private.save_f05_shared_storage_internal(
  p_storage_key text,
  p_value jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision bigint;
begin
  if not private.can_write_f05_storage(p_storage_key) then
    raise exception 'not authorized to write shared Front05 storage';
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'array' then
    raise exception 'invalid shared Front05 storage value';
  end if;

  update public.f05_shared_storage
  set value = p_value,
      revision = revision + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where storage_key = p_storage_key
    and revision = p_expected_revision
  returning revision into next_revision;

  return next_revision;
end;
$$;

revoke all on function private.save_f05_shared_storage_internal(text, jsonb, bigint) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.save_f05_shared_storage_internal(text, jsonb, bigint) to authenticated;

create or replace function public.save_f05_shared_storage(
  p_storage_key text,
  p_value jsonb,
  p_expected_revision bigint
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select private.save_f05_shared_storage_internal(p_storage_key, p_value, p_expected_revision);
$$;

revoke all on function public.save_f05_shared_storage(text, jsonb, bigint) from public, anon;
grant execute on function public.save_f05_shared_storage(text, jsonb, bigint) to authenticated;
