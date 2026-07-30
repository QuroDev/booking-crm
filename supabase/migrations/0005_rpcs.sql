-- Nouveau Booking CRM — atomic reschedule RPC + analytics RPCs.
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
