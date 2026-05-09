-- 직원 본인이 비밀번호 변경 후 must_change_password 해제
-- employees 테이블은 관리자만 직접 UPDATE 가능하므로, 본인 행의 플래그만 바꾸는 RPC로 처리합니다.

create or replace function public.mark_own_password_changed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
  set must_change_password = false, updated_at = now()
  where auth_user_id = auth.uid() and is_active = true;
end;
$$;

revoke all on function public.mark_own_password_changed() from public;
grant execute on function public.mark_own_password_changed() to authenticated;
