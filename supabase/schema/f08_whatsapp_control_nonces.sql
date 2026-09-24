-- Hárpia Patrimonial | autorização efêmera entre Edge Function e conector WhatsApp
-- Evita depender do mesmo segredo literal em ambientes diferentes.

create table if not exists public.whatsapp_control_nonces (
  token_hash text primary key,
  action text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_control_nonces enable row level security;

create index if not exists whatsapp_control_nonces_expires_at_idx
  on public.whatsapp_control_nonces (expires_at);


create or replace function public.admin_consume_whatsapp_control_nonce(
  p_token_hash text,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted text;
begin
  delete from public.whatsapp_control_nonces
  where token_hash = p_token_hash
    and action = p_action
    and expires_at > now()
  returning token_hash into v_deleted;

  delete from public.whatsapp_control_nonces
  where expires_at <= now();

  return v_deleted is not null;
end;
$$;

revoke all on function public.admin_consume_whatsapp_control_nonce(text,text) from public, anon, authenticated;
grant execute on function public.admin_consume_whatsapp_control_nonce(text,text) to service_role;
