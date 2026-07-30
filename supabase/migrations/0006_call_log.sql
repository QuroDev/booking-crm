-- Nouveau Booking CRM — shared call log (manual "who we already called" tracker).
--
-- Visibility rules:
--   * every signed-in employee can READ the whole log (that's the point —
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
