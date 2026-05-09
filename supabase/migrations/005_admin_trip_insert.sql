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
