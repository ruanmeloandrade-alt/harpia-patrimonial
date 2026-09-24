-- Hárpia Patrimonial | F08
-- Watchdog de heartbeat para impedir falso status conectado quando o processo morre.

create or replace function public.admin_mark_stale_whatsapp_connector()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  stale_count integer := 0;
begin
  update public.integration_connections
  set status = 'degraded',
      last_error_at = now(),
      last_error_code = 'heartbeat_stale',
      revision = revision + 1,
      updated_at = now()
  where provider = 'whatsapp'
    and status = 'connected'
    and (
      last_health_at is null
      or last_health_at < now() - interval '120 seconds'
    );

  get diagnostics stale_count = row_count;

  if stale_count > 0 then
    update public.inbox_channel_accounts
    set status = 'degraded',
        last_error_at = now(),
        last_error_code = 'heartbeat_stale',
        updated_at = now()
    where provider = 'whatsapp_web'
      and status = 'connected';

    update public.inbox_conversations
    set transport_status = 'error',
        updated_at = now()
    where provider = 'whatsapp_web'
      and transport_status = 'connected';
  end if;

  return stale_count;
end;
$function$;

revoke all on function public.admin_mark_stale_whatsapp_connector() from public, anon, authenticated;
grant execute on function public.admin_mark_stale_whatsapp_connector() to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'f08-whatsapp-heartbeat-watchdog';

select cron.schedule(
  'f08-whatsapp-heartbeat-watchdog',
  '* * * * *',
  $cron$
    select public.admin_mark_stale_whatsapp_connector();
  $cron$
);
