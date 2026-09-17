create extension if not exists pg_cron;
create schema if not exists extensions;

-- pg_net não é relocável via ALTER EXTENSION. Se uma instalação antiga estiver
-- no schema public, removemos e recriamos em extensions dentro da mesma migração.
do $$
declare
  v_schema text;
begin
  select n.nspname
    into v_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pg_net';

  if v_schema is not null and v_schema <> 'extensions' then
    execute 'drop extension pg_net';
  end if;
end
$$;

create extension if not exists pg_net with schema extensions;

create schema if not exists private;

create table if not exists private.f05_scheduler_auth (
  singleton boolean primary key default true check (singleton),
  token_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.f05_scheduler_auth from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on table private.f05_scheduler_auth to service_role;

do $$
declare
  v_token text;
begin
  select decrypted_secret
    into v_token
    from vault.decrypted_secrets
   where name = 'f05_scheduler_token'
   limit 1;

  if v_token is null then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(v_token, 'f05_scheduler_token', 'Token interno do scheduler durável da Frente 05');
  end if;

  insert into private.f05_scheduler_auth(singleton, token_hash, updated_at)
  values (true, encode(extensions.digest(v_token, 'sha256'), 'hex'), now())
  on conflict (singleton) do update
    set token_hash = excluded.token_hash,
        updated_at = excluded.updated_at;
end
$$;

create or replace function public.admin_validate_f05_scheduler_token(p_token text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
      from private.f05_scheduler_auth
     where singleton = true
       and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  );
$$;

revoke all on function public.admin_validate_f05_scheduler_token(text) from public, anon, authenticated;
grant execute on function public.admin_validate_f05_scheduler_token(text) to service_role;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'f05-delay-resume-30s';

select cron.schedule(
  'f05-delay-resume-30s',
  '30 seconds',
  $cron$
    select net.http_post(
      url := 'https://desxomqvtjaymwwxivwq.supabase.co/functions/v1/f05-delay-worker',
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
