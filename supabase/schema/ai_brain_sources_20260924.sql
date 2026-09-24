-- Hárpia Patrimonial | Cérebro dos Agentes IA
create table if not exists public.ai_brain_config (
  id boolean primary key default true check (id = true),
  company_context text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.user_profiles(id) on delete set null
);

create table if not exists public.ai_brain_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('text','pdf','image')),
  title text not null,
  text_content text null,
  storage_bucket text null,
  storage_path text null,
  mime_type text null,
  size_bytes bigint null,
  status text not null default 'ready' check (status in ('processing','ready','error')),
  error_message text null,
  created_by uuid null references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS e policies equivalentes foram aplicadas em produção em 2026-09-24.
-- Bucket privado: ai-brain
