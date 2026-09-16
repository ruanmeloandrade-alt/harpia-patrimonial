-- Hárpia Patrimonial — controle otimista para estado compartilhado CRM/Inbox.

create or replace function public.save_platform_module_state(
  p_module text,
  p_state jsonb,
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
  if not private.can_write_platform_module(p_module) then
    raise exception 'not authorized to write module state';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid module state';
  end if;

  update public.platform_module_state
  set state = p_state,
      revision = revision + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where module = p_module
    and revision = p_expected_revision
  returning revision into next_revision;

  return next_revision;
end;
$$;

revoke all on function public.save_platform_module_state(text,jsonb,bigint) from public, anon;
grant execute on function public.save_platform_module_state(text,jsonb,bigint) to authenticated;
