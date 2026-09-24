-- Hárpia Patrimonial | recuperação limitada de mensagens WhatsApp que falharam na ingestão
-- Lista apenas candidatos cujo ID externo falhou e cuja chave de identidade LID foi
-- atualizada imediatamente antes do evento. O conector rc14 usa esses candidatos
-- para solicitar placeholder resend ao telefone pareado.

create or replace function public.admin_list_whatsapp_recovery_candidates(
  p_session_id text,
  p_since timestamptz default now() - interval '1 day',
  p_limit integer default 25
)
returns table(
  external_message_id text,
  failed_at timestamptz,
  lid text,
  identity_updated_at timestamptz,
  seconds_after_identity numeric
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  return query
  with target_connection as (
    select c.id
    from public.integration_connections c
    where c.provider = 'whatsapp'
      and c.external_account_id = p_session_id
    order by c.updated_at desc
    limit 1
  ),
  failed as (
    select e.external_id, e.occurred_at
    from public.integration_events e
    join target_connection tc on tc.id = e.connection_id
    where e.provider = 'whatsapp'
      and e.event_type = 'message_ingest_failed'
      and e.external_id is not null
      and e.occurred_at >= p_since
      and not exists (
        select 1
        from public.inbox_messages m
        where m.provider = 'whatsapp_web'
          and m.external_message_id = e.external_id
      )
      and (
        select count(*)
        from public.integration_events r
        where r.connection_id = e.connection_id
          and r.provider = 'whatsapp'
          and r.event_type = 'message_recovery_requested'
          and r.external_id = e.external_id
      ) < 2
  ),
  identities as (
    select a.updated_at,
           regexp_replace(
             regexp_replace(a.state_key, '^identity-key:', ''),
             '_.*$', ''
           ) as lid
    from private.whatsapp_auth_state a
    where a.session_id = p_session_id
      and a.state_key like 'identity-key:%'
  )
  select
    f.external_id,
    f.occurred_at,
    i.lid,
    i.updated_at,
    round(extract(epoch from (f.occurred_at - i.updated_at))::numeric, 3)
  from failed f
  join lateral (
    select x.lid, x.updated_at
    from identities x
    where x.updated_at <= f.occurred_at
      and x.updated_at >= f.occurred_at - interval '5 seconds'
    order by f.occurred_at - x.updated_at asc
    limit 1
  ) i on true
  where i.lid ~ '^[0-9]+$'
  order by f.occurred_at asc
  limit greatest(1, least(coalesce(p_limit, 25), 50));
end;
$function$;

revoke all on function public.admin_list_whatsapp_recovery_candidates(text,timestamptz,integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_whatsapp_recovery_candidates(text,timestamptz,integer)
  to service_role;
