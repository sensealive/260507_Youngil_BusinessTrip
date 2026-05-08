export function inclusiveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / dayMs) + 1;
}

export function isTripCurrent(trip, today = new Date()) {
  if (!trip || trip.status !== "active") return false;
  const current = toDateOnly(today);
  return trip.start_date <= current && current <= trip.end_date;
}

export function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildStats(trips, employeesById = new Map(), departmentsById = new Map()) {
  const activeTrips = trips.filter((trip) => trip.status === "active");
  return {
    byYear: aggregate(activeTrips, (trip) => String(new Date(`${trip.start_date}T00:00:00`).getFullYear())),
    byDepartment: aggregate(activeTrips, (trip) => departmentsById.get(trip.department_id)?.name || "미지정 부서"),
    byEmployee: aggregate(activeTrips, (trip) => employeesById.get(trip.employee_id)?.name || "미지정 직원"),
    byCountry: aggregate(activeTrips, (trip) => trip.country || "미지정 국가"),
  };
}

function aggregate(trips, keyGetter) {
  const result = new Map();
  trips.forEach((trip) => {
    const key = keyGetter(trip);
    const current = result.get(key) || { label: key, tripCount: 0, days: 0 };
    current.tripCount += 1;
    current.days += inclusiveDays(trip.start_date, trip.end_date);
    result.set(key, current);
  });
  return Array.from(result.values()).sort((a, b) => b.days - a.days || a.label.localeCompare(b.label, "ko"));
}
