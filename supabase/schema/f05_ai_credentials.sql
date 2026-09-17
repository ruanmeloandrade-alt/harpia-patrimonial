create schema if not exists private_f05;

revoke all on schema private_f05 from public, anon, authenticated;
grant usage on schema private_f05 to service_role;

create table if not exists private_f05.ai_provider_credentials (
  profile_id text primary key,
  vault_secret_id uuid not null unique references vault.secrets(id) on delete cascade,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_credentials_profile_id_check check (char_length(trim(profile_id)) between 1 and 200)
);

alter table private_f05.ai_provider_credentials enable row level security;
revoke all on table private_f05.ai_provider_credentials from public, anon, authenticated;
grant select, insert, update, delete on table private_f05.ai_provider_credentials to service_role;

create policy "f05_private_credentials_deny_direct_authenticated"
on private_f05.ai_provider_credentials
for all
to authenticated
using (false)
with check (false);

create or replace function public.f05_store_ai_secret(
  p_profile_id text,
  p_secret text,
  p_actor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id text := trim(p_profile_id);
  v_secret_id uuid;
begin
  if v_profile_id is null or char_length(v_profile_id) < 1 or char_length(v_profile_id) > 200 then
    raise exception 'Perfil de IA inválido.';
  end if;
  if p_secret is null or char_length(trim(p_secret)) < 8 then
    raise exception 'Credencial de IA inválida.';
  end if;

  select c.vault_secret_id into v_secret_id
  from private_f05.ai_provider_credentials c
  where c.profile_id = v_profile_id;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(p_secret, null, 'Hárpia F05 - credencial de provedor IA');
    insert into private_f05.ai_provider_credentials (profile_id, vault_secret_id, created_by, updated_by)
    values (v_profile_id, v_secret_id, p_actor, p_actor);
  else
    perform vault.update_secret(v_secret_id, p_secret, null, 'Hárpia F05 - credencial de provedor IA');
    update private_f05.ai_provider_credentials
      set updated_by = p_actor,
          updated_at = now()
    where profile_id = v_profile_id;
  end if;

  return v_secret_id;
end;
$$;

create or replace function public.f05_remove_ai_secret(p_profile_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  select c.vault_secret_id into v_secret_id
  from private_f05.ai_provider_credentials c
  where c.profile_id = trim(p_profile_id);

  if v_secret_id is null then
    return false;
  end if;

  delete from vault.secrets where id = v_secret_id;
  delete from private_f05.ai_provider_credentials where profile_id = trim(p_profile_id);
  return true;
end;
$$;

create or replace function public.f05_resolve_ai_secret(p_profile_id text, p_secret_ref uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select d.decrypted_secret
  from private_f05.ai_provider_credentials c
  join vault.decrypted_secrets d on d.id = c.vault_secret_id
  where c.profile_id = trim(p_profile_id)
    and c.vault_secret_id = p_secret_ref
  limit 1;
$$;

revoke all on function public.f05_store_ai_secret(text, text, uuid) from public, anon, authenticated;
revoke all on function public.f05_remove_ai_secret(text) from public, anon, authenticated;
revoke all on function public.f05_resolve_ai_secret(text, uuid) from public, anon, authenticated;

grant execute on function public.f05_store_ai_secret(text, text, uuid) to service_role;
grant execute on function public.f05_remove_ai_secret(text) to service_role;
grant execute on function public.f05_resolve_ai_secret(text, uuid) to service_role;
