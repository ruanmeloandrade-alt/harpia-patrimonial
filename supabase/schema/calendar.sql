-- Calendar workspace and Google Calendar foundation
-- Production migration: calendar_workspace_google_foundation_20260924

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'task' check (kind in ('task','meeting')),
  title text not null check (char_length(btrim(title)) > 0),
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  assignee_id uuid references public.internal_assignee_directory(id) on delete set null,
  lead_id text references public.crm_leads(id) on delete set null,
  guest_emails text[] not null default '{}',
  location text,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  source text not null default 'manual' check (source in ('manual','crm','salesbot','google')),
  sync_to_google boolean not null default false,
  google_sync_status text not null default 'not_requested' check (google_sync_status in ('not_requested','pending','synced','error','not_connected')),
  google_calendar_id text,
  google_event_id text,
  google_meet_url text,
  google_html_link text,
  google_sync_error text,
  google_sync_requested_at timestamptz,
  created_by uuid references public.user_profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_items_time_check check (end_at > start_at)
);

-- RLS is permission-based: calendar.view / calendar.manage.
-- Google transport is intentionally separated into the authenticated
-- calendar-google-sync Edge Function so OAuth can be completed later
-- without changing the calendar data model.
