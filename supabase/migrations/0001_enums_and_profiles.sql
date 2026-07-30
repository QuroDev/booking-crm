-- Nouveau Booking CRM — enums, profiles, admin bootstrapping.

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
