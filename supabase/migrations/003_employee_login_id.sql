-- 직원 로그인 ID 추가
-- 화면에서는 yh.seo 같은 ID로 로그인하고, 내부 Supabase Auth 이메일은 yh.seo@project.local 형태로 연결합니다.

alter table public.employees
add column if not exists login_id text;

update public.employees
set login_id = lower(split_part(login_email, '@', 1))
where login_id is null or trim(login_id) = '';

alter table public.employees
alter column login_id set not null;

create unique index if not exists employees_login_id_key
on public.employees(login_id);

create index if not exists idx_employees_login_id
on public.employees(login_id);
