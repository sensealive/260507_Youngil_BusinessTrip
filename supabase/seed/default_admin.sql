-- 기본 관리자 직원 행 연결 (Authentication에서 먼저 사용자를 만든 뒤 실행)
--
-- 사전 작업(Supabase 대시보드):
--   Authentication → Users → Add user
--   - Email: admin@project.local  (화면에서는 아이디 admin 만 입력하면 됩니다)
--   - Password: 174100
--   - Auto Confirm User: ON
--
-- 관리부가 있어야 합니다(README/`Supabase_setup` 시드 참고).

insert into public.employees (department_id, name, role, login_id, login_email, auth_user_id, must_change_password)
select d.id, '시스템관리자', 'admin', 'admin', 'admin@project.local', u.id, true
from public.departments d
cross join lateral (select id from auth.users where email = 'admin@project.local' limit 1) u
where d.name = '관리부'
limit 1
on conflict (login_email) do update set
  auth_user_id = excluded.auth_user_id,
  login_id = excluded.login_id,
  department_id = excluded.department_id,
  name = excluded.name,
  role = excluded.role,
  updated_at = now();
