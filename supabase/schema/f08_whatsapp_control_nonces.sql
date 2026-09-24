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
