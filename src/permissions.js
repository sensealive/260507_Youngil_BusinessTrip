export const ROLES = {
  EMPLOYEE: "employee",
  DEPARTMENT_MANAGER: "department_manager",
  ADMIN: "admin",
};

export function roleLabel(role) {
  return {
    [ROLES.EMPLOYEE]: "일반 직원",
    [ROLES.DEPARTMENT_MANAGER]: "부서장",
    [ROLES.ADMIN]: "관리자",
  }[role] || "일반 직원";
}

export function isAdmin(profile) {
  return profile?.role === ROLES.ADMIN;
}

export function isDepartmentManager(profile) {
  return profile?.role === ROLES.DEPARTMENT_MANAGER;
}

export function canViewTrip(profile, trip) {
  if (!profile || !trip) return false;
  if (isAdmin(profile)) return true;
  if (isDepartmentManager(profile)) return trip.department_id === profile.department_id;
  return trip.employee_id === profile.id || trip.department_id === profile.department_id;
}

export function canEditTrip(profile, trip) {
  if (!profile || !trip) return false;
  if (isAdmin(profile)) return true;
  return trip.employee_id === profile.id && trip.status === "active";
}

export function defaultTripScopeLabel(profile) {
  if (isAdmin(profile)) return "전체 출장";
  if (isDepartmentManager(profile)) return "부서 출장";
  return "내 출장 및 부서 현황";
}
