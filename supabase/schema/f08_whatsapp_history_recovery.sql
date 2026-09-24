-- Hárpia Patrimonial | recuperação on-demand de histórico por conversa
-- Uma única solicitação por JID, baseada em uma mensagem externa real que falhou.

create or replace function public.admin_list_whatsapp_history_recovery_threads(
  p_session_id text,
  p_since timestamptz default now() - interval '1 day',
  p_limit integer default 10
)
returns table(
  pn_jid text,
  external_message_id text,
  failed_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $function$
begin
  if coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  return query
  with target_connection as (
    select c.id
    from public.integration_connections c
    where c.provider='whatsapp'
      and c.external_account_id=p_session_id
    order by c.updated_at desc
    limit 1
  ),
  resolved as (
    select
      e.metadata->>'pnJid' as pn_jid,
      e.external_id,
      (e.metadata->>'failedAt')::timestamptz as failed_at,
      row_number() over (
        partition by e.metadata->>'pnJid'
        order by (e.metadata->>'failedAt')::timestamptz asc, e.occurred_at asc
      ) as rn
    from public.integration_events e
    join target_connection tc on tc.id=e.connection_id
    where e.provider='whatsapp'
      and e.event_type='message_recovery_requested'
      and e.occurred_at >= p_since
      and nullif(e.metadata->>'pnJid','') is not null
      and nullif(e.external_id,'') is not null
      and nullif(e.metadata->>'failedAt','') is not null
  )
  select r.pn_jid,r.external_id,r.failed_at
  from resolved r
  join target_connection tc on true
  where r.rn=1
    and not exists (
      select 1
      from public.integration_events h
      where h.connection_id=tc.id
        and h.provider='whatsapp'
        and h.event_type='history_recovery_requested'
        and h.metadata->>'pnJid'=r.pn_jid
    )
  order by r.failed_at asc
  limit greatest(1,least(coalesce(p_limit,10),10));
end;
$function$;

revoke all on function public.admin_list_whatsapp_history_recovery_threads(text,timestamptz,integer)
  from public,anon,authenticated;
grant execute on function public.admin_list_whatsapp_history_recovery_threads(text,timestamptz,integer)
  to service_role;
