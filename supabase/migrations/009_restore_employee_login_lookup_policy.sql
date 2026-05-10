drop policy if exists employees_select_for_login_and_app on public.employees;

create policy employees_select_for_login_and_app
on public.employees for select
using (is_active = true or public.is_admin());
