-- Youngil business trip management schema
-- Run this in the Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  name text not null,
  position text,
  role text not null default 'employee' check (role in ('employee', 'department_manager', 'admin')),
  login_id text not null unique,
  login_email text not null unique,
  auth_user_id uuid not null unique,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  department_id uuid not null references public.departments(id),
  start_date date not null,
  end_date date not null,
  country text not null,
  company_name text not null,
  city text,
  note text,
  status text not null default 'active' check (status in ('active', 'cancelled', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_employee_id uuid references public.employees(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_department on public.employees(department_id);
create index if not exists idx_employees_login_id on public.employees(login_id);
create index if not exists idx_employees_auth_user on public.employees(auth_user_id);
create index if not exists idx_companies_active on public.companies(is_active);
create index if not exists idx_trips_employee on public.trips(employee_id);
create index if not exists idx_trips_department on public.trips(department_id);
create index if not exists idx_trips_dates on public.trips(start_date, end_date);
create index if not exists idx_trips_status on public.trips(status);

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees
  where auth_user_id = auth.uid() and is_active = true
  limit 1
$$;

create or replace function public.current_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.employees
  where auth_user_id = auth.uid() and is_active = true
  limit 1
$$;

create or replace function public.current_employee_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.employees
  where auth_user_id = auth.uid() and is_active = true
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_employee_role() = 'admin', false)
$$;

alter table public.departments enable row level security;
alter table public.countries enable row level security;
alter table public.employees enable row level security;
alter table public.trips enable row level security;
alter table public.companies enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists departments_select_public on public.departments;
create policy departments_select_public
on public.departments for select
using (is_active = true or public.is_admin());

drop policy if exists departments_admin_all on public.departments;
create policy departments_admin_all
on public.departments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists countries_select_public on public.countries;
create policy countries_select_public
on public.countries for select
using (is_active = true or public.is_admin());

drop policy if exists countries_admin_all on public.countries;
create policy countries_admin_all
on public.countries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists companies_select_public on public.companies;
create policy companies_select_public
on public.companies for select
using (is_active = true or public.is_admin());

drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all
on public.companies for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists employees_select_for_login_and_app on public.employees;
create policy employees_select_for_login_and_app
on public.employees for select
using (is_active = true or public.is_admin());

drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all
on public.employees for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists trips_select_by_role on public.trips;
create policy trips_select_by_role
on public.trips for select
to authenticated
using (
  public.is_admin()
  or employee_id = public.current_employee_id()
  or department_id = public.current_department_id()
);

drop policy if exists trips_insert_own on public.trips;
create policy trips_insert_own
on public.trips for insert
to authenticated
with check (
  public.is_admin()
  or (
    employee_id = public.current_employee_id()
    and department_id = public.current_department_id()
  )
);

drop policy if exists trips_update_own_or_admin on public.trips;
create policy trips_update_own_or_admin
on public.trips for update
to authenticated
using (public.is_admin() or employee_id = public.current_employee_id())
with check (public.is_admin() or employee_id = public.current_employee_id());

drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
on public.audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert
on public.audit_logs for insert
to authenticated
with check (public.is_admin());

insert into public.countries (name, sort_order) values
  ('일본', 10),
  ('중국', 20),
  ('베트남', 30),
  ('미국', 40),
  ('인도', 50),
  ('독일', 60),
  ('멕시코', 70),
  ('기타', 999)
on conflict (name) do update set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.companies (name) values
  ('한국단자(멕시코)'),
  ('한국단자(폴란드)'),
  ('LS EVK(폴란드)'),
  ('LS EVK(국내)'),
  ('경주발레오(국내)'),
  ('현대모비스(국내)')
on conflict (name) do update set
  is_active = true,
  updated_at = now();
