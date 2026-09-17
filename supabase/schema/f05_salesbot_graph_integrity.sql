create or replace function private.validate_f05_salesbot_graph_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bad_id text;
  v_bad_target text;
  v_cycle text[];
begin
  if new.storage_key <> 'harpia:f05:salesbots' then
    return new;
  end if;

  if jsonb_typeof(new.value) <> 'array' then
    raise exception 'F05 SalesBot storage precisa ser um array JSON.';
  end if;

  select bot->>'id'
    into v_bad_id
    from jsonb_array_elements(new.value) as bot
   where coalesce(bot->>'id', '') = ''
   limit 1;
  if v_bad_id is not null then
    raise exception 'SalesBot sem ID não pode ser persistido.';
  end if;

  if exists (
    select 1
      from (
        select bot->>'id' as id, count(*) over (partition by bot->>'id') as cnt
          from jsonb_array_elements(new.value) as bot
      ) q
     where q.cnt > 1
  ) then
    raise exception 'IDs duplicados de SalesBot não são permitidos.';
  end if;

  select bot->>'id'
    into v_bad_id
    from jsonb_array_elements(new.value) as bot
   where bot->>'status' = 'active'
     and (
       jsonb_typeof(bot->'blocks') <> 'array'
       or jsonb_array_length(coalesce(bot->'blocks', '[]'::jsonb)) = 0
     )
   limit 1;
  if v_bad_id is not null then
    raise exception 'SalesBot ativo % precisa possuir ao menos um bloco.', v_bad_id;
  end if;

  with bots as (
    select bot->>'id' as id, bot->>'status' as status, bot
      from jsonb_array_elements(new.value) as bot
  ), edges as (
    select b.id as source_id, block->'config'->>'botId' as target_id
      from bots b
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(b.bot->'blocks') = 'array' then b.bot->'blocks' else '[]'::jsonb end
      ) as block
     where b.status = 'active'
       and block->>'type' = 'chain_flow'
       and coalesce(block->'config'->>'botId', '') <> ''
  )
  select e.target_id
    into v_bad_target
    from edges e
    left join bots target on target.id = e.target_id
   where target.id is null or target.status <> 'active'
   limit 1;
  if v_bad_target is not null then
    raise exception 'SalesBot ativo referencia fluxo inexistente ou inativo: %.', v_bad_target;
  end if;

  with recursive bots as (
    select bot->>'id' as id, bot->>'status' as status, bot
      from jsonb_array_elements(new.value) as bot
  ), edges as (
    select b.id as source_id, block->'config'->>'botId' as target_id
      from bots b
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(b.bot->'blocks') = 'array' then b.bot->'blocks' else '[]'::jsonb end
      ) as block
     where b.status = 'active'
       and block->>'type' = 'chain_flow'
       and coalesce(block->'config'->>'botId', '') <> ''
  ), walk(start_id, current_id, path, cycle) as (
    select e.source_id, e.target_id, array[e.source_id, e.target_id]::text[], e.target_id = e.source_id
      from edges e
    union all
    select w.start_id,
           e.target_id,
           w.path || e.target_id,
           e.target_id = any(w.path)
      from walk w
      join edges e on e.source_id = w.current_id
     where not w.cycle
       and cardinality(w.path) < 64
  )
  select path
    into v_cycle
    from walk
   where cycle
   limit 1;

  if v_cycle is not null then
    raise exception 'Ciclo de encadeamento de SalesBot detectado: %.', array_to_string(v_cycle, ' -> ');
  end if;

  return new;
end
$$;

revoke all on function private.validate_f05_salesbot_graph_storage() from public, anon, authenticated;
grant execute on function private.validate_f05_salesbot_graph_storage() to postgres, service_role;

drop trigger if exists trg_validate_f05_salesbot_graph_storage on public.f05_shared_storage;
create trigger trg_validate_f05_salesbot_graph_storage
before insert or update of value on public.f05_shared_storage
for each row
execute function private.validate_f05_salesbot_graph_storage();
