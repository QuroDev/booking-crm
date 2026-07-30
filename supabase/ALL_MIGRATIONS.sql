-- Nouveau Booking CRM â€” enums, profiles, admin bootstrapping.

create type public.user_role as enum ('admin', 'employee');
create type public.booking_status as enum
  ('booked', 'completed', 'cancelled', 'rescheduled', 'no_show', 'closed');
create type public.call_type as enum ('google_meet', 'phone', 'facetime', 'whatsapp');
create type public.google_sync_status as enum ('pending', 'synced', 'failed', 'skipped');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  full_name  text not null default '',
  role       public.user_role not null default 'employee',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile for every auth user; admins are determined by email allowlist.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when lower(new.email) in ('qaisnaveed2008@gmail.com', 'jaydxn413@gmail.com')
        then 'admin'::public.user_role
      else 'employee'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- SECURITY DEFINER so RLS policies can check admin-ness without recursing into
-- the profiles policies themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

revoke execute on function public.is_admin() from anon;

alter table public.profiles enable row level security;

create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: admin update"
  on public.profiles for update
  using (public.is_admin());
-- Nouveau Booking CRM â€” bookings table, indexes, RLS.

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
-- Nouveau Booking CRM â€” booking history (reschedules, status changes, edits).

create table public.booking_history (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings (id) on delete cascade,
  action            text not null check (action in
                      ('created', 'rescheduled', 'status_changed', 'edited')),
  changed_by        uuid not null references public.profiles (id),
  changed_at        timestamptz not null default now(),

  prev_meeting_date date,
  prev_meeting_time time,
  prev_timezone     text,
  prev_start_utc    timestamptz,
  new_meeting_date  date,
  new_meeting_time  time,
  new_timezone      text,
  new_start_utc     timestamptz,

  prev_status       public.booking_status,
  new_status        public.booking_status,

  details           jsonb not null default '{}'::jsonb
);

create index booking_history_booking_idx
  on public.booking_history (booking_id, changed_at desc);
create index booking_history_changed_at_idx
  on public.booking_history (changed_at desc);

alter table public.booking_history enable row level security;

create policy "history: follows booking visibility"
  on public.booking_history for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.created_by = auth.uid()
    )
  );

create policy "history: insert by actor on visible booking"
  on public.booking_history for insert
  with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.created_by = auth.uid() or public.is_admin())
    )
  );
-- Nouveau Booking CRM â€” Google OAuth refresh-token storage (singleton row).
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
-- Nouveau Booking CRM â€” atomic reschedule RPC + analytics RPCs.
--
-- All functions are SECURITY INVOKER so row-level security applies: employees
-- get numbers scoped to their own bookings, admins get everything.

-- Atomically snapshot the old meeting into history and update the booking.
create or replace function public.reschedule_booking(
  p_booking_id    uuid,
  p_new_date      date,
  p_new_time      time,
  p_new_timezone  text,
  p_new_start_utc timestamptz,
  p_new_end_utc   timestamptz
)
returns public.bookings
language plpgsql
security invoker
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found or not permitted';
  end if;

  insert into public.booking_history (
    booking_id, action, changed_by,
    prev_meeting_date, prev_meeting_time, prev_timezone, prev_start_utc,
    new_meeting_date,  new_meeting_time,  new_timezone,  new_start_utc
  ) values (
    p_booking_id, 'rescheduled', auth.uid(),
    v_booking.meeting_date, v_booking.meeting_time,
    v_booking.client_timezone, v_booking.start_time_utc,
    p_new_date, p_new_time, p_new_timezone, p_new_start_utc
  );

  update public.bookings set
    meeting_date       = p_new_date,
    meeting_time       = p_new_time,
    client_timezone    = p_new_timezone,
    start_time_utc     = p_new_start_utc,
    end_time_utc       = p_new_end_utc,
    status             = 'rescheduled',
    google_sync_status = 'pending'
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

-- Bookings per ISO week (by meeting start).
create or replace function public.bookings_by_week(p_from timestamptz, p_to timestamptz)
returns table (week_start date, total bigint)
language sql
stable
security invoker
as $$
  select date_trunc('week', start_time_utc)::date as week_start, count(*) as total
  from public.bookings
  where start_time_utc >= p_from and start_time_utc < p_to
  group by 1
  order by 1;
$$;

create or replace function public.bookings_by_month(p_from timestamptz, p_to timestamptz)
returns table (month_start date, total bigint)
language sql
stable
security invoker
as $$
  select date_trunc('month', start_time_utc)::date as month_start, count(*) as total
  from public.bookings
  where start_time_utc >= p_from and start_time_utc < p_to
  group by 1
  order by 1;
$$;

create or replace function public.bookings_by_employee(p_from timestamptz, p_to timestamptz)
returns table (employee_id uuid, employee_name text, total bigint, completed bigint)
language sql
stable
security invoker
as $$
  select
    p.id,
    coalesce(nullif(p.full_name, ''), p.email) as employee_name,
    count(b.id) as total,
    count(b.id) filter (where b.status = 'completed') as completed
  from public.bookings b
  join public.profiles p on p.id = b.created_by
  where b.start_time_utc >= p_from and b.start_time_utc < p_to
  group by p.id, employee_name
  order by total desc;
$$;

create or replace function public.bookings_by_call_type(p_from timestamptz, p_to timestamptz)
returns table (call_type public.call_type, total bigint)
language sql
stable
security invoker
as $$
  select b.call_type, count(*) as total
  from public.bookings b
  where b.start_time_utc >= p_from and b.start_time_utc < p_to
  group by b.call_type
  order by total desc;
$$;

create or replace function public.booking_outcome_counts(p_from timestamptz, p_to timestamptz)
returns table (status public.booking_status, total bigint)
language sql
stable
security invoker
as $$
  select b.status, count(*) as total
  from public.bookings b
  where b.start_time_utc >= p_from and b.start_time_utc < p_to
  group by b.status
  order by total desc;
$$;

-- Interest popularity (unnests the multi-select).
create or replace function public.bookings_by_interest(p_from timestamptz, p_to timestamptz)
returns table (interest text, total bigint)
language sql
stable
security invoker
as $$
  select i.interest, count(*) as total
  from public.bookings b, unnest(b.interests) as i(interest)
  where b.start_time_utc >= p_from and b.start_time_utc < p_to
  group by i.interest
  order by total desc;
$$;
-- Nouveau Booking CRM â€” shared call log (manual "who we already called" tracker).
--
-- Visibility rules:
--   * every signed-in employee can READ the whole log (that's the point â€”
--     nobody should call the same person twice)
--   * employees can ADD entries and EDIT their own
--   * nobody can delete except admins (admins can do everything)

create table public.call_log (
  id            uuid primary key default gen_random_uuid(),
  logged_by     uuid not null references public.profiles (id),
  contact_name  text not null,
  business_name text,
  phone         text not null,
  email         text,
  call_date     date not null default current_date,
  outcome       text not null check (outcome in
                  ('no_answer', 'callback', 'not_interested',
                   'interested', 'booked', 'wrong_number')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index call_log_phone_idx on public.call_log (phone);
create index call_log_date_idx  on public.call_log (call_date desc, created_at desc);
create index call_log_search_idx on public.call_log using gin (
  (contact_name || ' ' || coalesce(business_name, '') || ' ' ||
   phone || ' ' || coalesce(email, '')) gin_trgm_ops
);

create trigger call_log_set_updated_at
before update on public.call_log
for each row execute function public.set_updated_at();

alter table public.call_log enable row level security;

create policy "call_log: everyone signed in can read"
  on public.call_log for select
  to authenticated
  using (true);

create policy "call_log: insert own"
  on public.call_log for insert
  to authenticated
  with check (logged_by = auth.uid());

create policy "call_log: update own or admin"
  on public.call_log for update
  to authenticated
  using (logged_by = auth.uid() or public.is_admin());

create policy "call_log: delete admin only"
  on public.call_log for delete
  to authenticated
  using (public.is_admin());
