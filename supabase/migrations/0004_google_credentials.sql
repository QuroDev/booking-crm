-- Nouveau Booking CRM — Google OAuth refresh-token storage (singleton row).
--
-- RLS is enabled with NO policies: anon/authenticated clients can never touch
-- this table. Only the service-role client (src/lib/supabase/admin.ts,
-- server-only) reads or writes it.

create table public.google_credentials (
  id            int primary key default 1 check (id = 1),
  google_email  text not null,
  refresh_token text not null,
  connected_by  uuid references public.profiles (id),
  updated_at    timestamptz not null default now()
);

alter table public.google_credentials enable row level security;
