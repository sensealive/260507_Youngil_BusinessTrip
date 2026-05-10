drop policy if exists trips_select_by_role on public.trips;

create policy trips_select_by_role
on public.trips for select
to authenticated
using (true);
