-- Nouveau Booking CRM — bookings table, indexes, RLS.

create extension if not exists pg_trgm;

create table public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  created_by         uuid not null references public.profiles (id),

  -- Client information
  first_name         text not null,
  last_name          text not null,
  business_name      text not null,
  email              text not null,
  phone              text not null,
  whatsapp           text,
  city               text not null,
  country            text not null,
  client_timezone    text not null,  -- IANA identifier, validated app-side

  -- Meeting: the local wall-clock values are stored verbatim alongside the
  -- converted UTC instants so the original selection is never lost.
  meeting_date       date not null,
  meeting_time       time not null,
  duration_minutes   int not null default 60 check (duration_minutes between 15 and 240),
  start_time_utc     timestamptz not null,
  end_time_utc       timestamptz not null,
  call_type          public.call_type not null,

  -- Business questions
  acquisition_method text,
  interests          text[] not null default '{}',
  notes              text,

  status             public.booking_status not null default 'booked',

  -- Google Calendar sync
  google_event_id    text,
  meet_link          text,
  google_sync_status public.google_sync_status not null default 'pending',
  google_sync_error  text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index bookings_created_by_idx on public.bookings (created_by);
create index bookings_start_utc_idx  on public.bookings (start_time_utc);
create index bookings_status_idx     on public.bookings (status);
create index bookings_email_idx      on public.bookings (lower(email));
create index bookings_search_idx     on public.bookings using gin (
  (first_name || ' ' || last_name || ' ' || business_name || ' ' ||
   email || ' ' || phone || ' ' || city) gin_trgm_ops
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

create policy "bookings: select own or admin"
  on public.bookings for select
  using (created_by = auth.uid() or public.is_admin());

create policy "bookings: insert own"
  on public.bookings for insert
  with check (created_by = auth.uid());

create policy "bookings: update own or admin"
  on public.bookings for update
  using (created_by = auth.uid() or public.is_admin());

create policy "bookings: delete admin only"
  on public.bookings for delete
  using (public.is_admin());
