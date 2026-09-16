-- Hárpia Patrimonial — cofre seguro de credenciais de IA
-- A chave bruta fica apenas no Supabase Vault e nunca é exposta ao frontend.

create table if not exists private.ai_credential_refs (
  profile_id text primary key,
  secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.admin_store_ai_credential(p_profile_id text, p_api_key text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_secret_id uuid;
  stored_secret_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if nullif(btrim(p_profile_id), '') is null then raise exception 'profile_id required'; end if;
  if nullif(btrim(p_api_key), '') is null then raise exception 'api_key required'; end if;

  select r.secret_id into existing_secret_id
  from private.ai_credential_refs r
  where r.profile_id = p_profile_id;

  if existing_secret_id is not null then
    perform vault.update_secret(existing_secret_id, p_api_key, 'harpia_ai_' || p_profile_id, 'Harpia AI provider credential', null);
    update private.ai_credential_refs set updated_at = now() where profile_id = p_profile_id;
    return existing_secret_id;
  end if;

  stored_secret_id := vault.create_secret(p_api_key, 'harpia_ai_' || p_profile_id, 'Harpia AI provider credential', null);
  insert into private.ai_credential_refs(profile_id, secret_id) values (p_profile_id, stored_secret_id);
  return stored_secret_id;
end;
$$;

create or replace function public.admin_delete_ai_credential(p_profile_id text, p_secret_ref uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_secret_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select r.secret_id into existing_secret_id
  from private.ai_credential_refs r
  where r.profile_id = p_profile_id
    and (p_secret_ref is null or r.secret_id = p_secret_ref);

  if existing_secret_id is null then return false; end if;
  delete from private.ai_credential_refs where profile_id = p_profile_id;
  delete from vault.secrets where id = existing_secret_id;
  return true;
end;
$$;

create or replace function public.admin_resolve_ai_credential(p_profile_id text, p_secret_ref uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_secret text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  select ds.decrypted_secret into resolved_secret
  from private.ai_credential_refs r
  join vault.decrypted_secrets ds on ds.id = r.secret_id
  where r.profile_id = p_profile_id and r.secret_id = p_secret_ref;
  return resolved_secret;
end;
$$;

revoke all on function public.admin_store_ai_credential(text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_ai_credential(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_resolve_ai_credential(text, uuid) from public, anon, authenticated;
grant execute on function public.admin_store_ai_credential(text, text) to service_role;
grant execute on function public.admin_delete_ai_credential(text, uuid) to service_role;
grant execute on function public.admin_resolve_ai_credential(text, uuid) to service_role;
revoke all on table private.ai_credential_refs from public, anon, authenticated;
grant select, insert, update, delete on table private.ai_credential_refs to service_role;
