-- Hárpia Patrimonial — Frente05
-- Hardening da escrita do estado compartilhado.
-- Desenho canônico: RLS decide quais storage_key o usuário pode alterar e o
-- RPC público roda como SECURITY INVOKER, sem elevação no schema exposto.

drop policy if exists f05_shared_storage_update on public.f05_shared_storage;
create policy f05_shared_storage_update
on public.f05_shared_storage
for update
to authenticated
using (private.can_write_f05_storage(storage_key))
with check (private.can_write_f05_storage(storage_key));

revoke all on public.f05_shared_storage from anon, authenticated;
grant select, update on public.f05_shared_storage to authenticated;
grant select on public.f05_shared_storage to service_role;

create or replace function public.save_f05_shared_storage(
  p_storage_key text,
  p_value jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security invoker
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

revoke all on function public.save_f05_shared_storage(text, jsonb, bigint) from public, anon;
grant execute on function public.save_f05_shared_storage(text, jsonb, bigint) to authenticated;

drop function if exists private.save_f05_shared_storage_internal(text, jsonb, bigint);
