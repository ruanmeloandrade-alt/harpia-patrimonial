-- Hárpia Patrimonial — QA final / compatibilidade de service_role
-- Aplicar após os schemas de Auth, Catálogo, CRM/Inbox, Vault e workers.
--
-- Supabase aceita tanto a chave service_role JWT legada quanto as secret keys
-- modernas. As secret keys atuais chegam ao Postgres com role=service_role, mas
-- não dependem do claim legado request.jwt.claim.role. Este hardening mantém
-- compatibilidade com os dois formatos sem alterar a regra de negócio dos RPCs.

create or replace function private.is_service_role_request()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  jwt_role text := '';
begin
  begin
    jwt_role := coalesce(
      (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'role'),
      ''
    );
  exception when others then
    jwt_role := '';
  end;

  return coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or jwt_role = 'service_role'
    or coalesce(current_setting('role', true), '') = 'service_role';
end;
$$;

revoke all on function private.is_service_role_request() from public, anon, authenticated;
grant execute on function private.is_service_role_request() to service_role;

-- Evita duplicar as implementações extensas dos módulos. A migração troca
-- exclusivamente a detecção antiga de service_role nos contratos já instalados.
-- É idempotente: se a função já estiver endurecida, apenas valida e segue.
do $$
declare
  r record;
  old_def text;
  new_def text;
begin
  for r in
    select p.oid, n.nspname, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prokind = 'f'
      and (
        (n.nspname = 'private' and p.proname = 'protect_catalog_integrity')
        or (
          n.nspname = 'public'
          and p.proname in (
            'admin_apply_crm_automation_action',
            'admin_claim_automation_events',
            'admin_delete_ai_credential',
            'admin_finish_automation_event',
            'admin_ingest_public_lead',
            'admin_resolve_ai_credential',
            'admin_store_ai_credential'
          )
        )
      )
  loop
    old_def := pg_get_functiondef(r.oid);
    new_def := replace(
      replace(
        old_def,
        'coalesce(current_setting(''request.jwt.claim.role'', true), '''') <> ''service_role''',
        'not private.is_service_role_request()'
      ),
      'coalesce(current_setting(''request.jwt.claim.role'', true), '''') = ''service_role''',
      'private.is_service_role_request()'
    );

    if new_def <> old_def then
      execute new_def;
    elsif old_def not ilike '%private.is_service_role_request()%' then
      raise exception 'service_role compatibility pattern not found in %.%', r.nspname, r.proname;
    end if;
  end loop;
end;
$$;
