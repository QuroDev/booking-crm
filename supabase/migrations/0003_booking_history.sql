-- Nouveau Booking CRM — booking history (reschedules, status changes, edits).

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
