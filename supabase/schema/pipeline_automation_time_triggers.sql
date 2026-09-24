-- Gatilhos de tempo da pipeline: deduplicação por permanência na etapa
-- e execução periódica do worker usando o token interno já mantido no Vault.

create unique index if not exists automation_time_event_once_per_stage_stay_idx
on public.automation_event_outbox (
  (payload->>'automationId'),
  lead_id,
  (payload->>'stageSince')
)
where event_type = 'lead.inactivity'
  and payload ? 'automationId'
  and payload ? 'stageSince';

do $$
declare
  existing_job bigint;
begin
  select jobid
    into existing_job
    from cron.job
   where jobname = 'harpia-automation-worker-1m'
   limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'harpia-automation-worker-1m',
    '* * * * *',
    $cron$
      select net.http_post(
        url := 'https://desxomqvtjaymwwxivwq.supabase.co/functions/v1/automation-event-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-f05-scheduler-token', (
            select decrypted_secret
              from vault.decrypted_secrets
             where name = 'f05_scheduler_token'
             limit 1
          )
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
end
$$;
