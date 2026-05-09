-- 4페이지 개편: 직급 표시와 업체등록(출장지) 관리

alter table public.employees
add column if not exists position text;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_active
on public.companies(is_active);

alter table public.companies enable row level security;

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
