import { escapeHtml } from "./trips.js";

export function renderDepartments(departments) {
  if (!departments.length) return `<div class="empty-state">등록된 부서가 없습니다.</div>`;
  return departments.map((department) => `
    <div class="compact-row">
      <span>${escapeHtml(department.name)}</span>
      <small>${department.is_active ? "사용" : "비활성"}</small>
    </div>
  `).join("");
}

export function renderEmployees(employees, departmentsById) {
  if (!employees.length) return `<div class="empty-state">등록된 직원이 없습니다.</div>`;
  return employees.map((employee) => `
    <div class="compact-row">
      <div>
        <strong>${escapeHtml(employee.name)}</strong>
        <small>${escapeHtml(departmentsById.get(employee.department_id)?.name || "미지정 부서")} · ${roleText(employee.role)}</small>
      </div>
      <small>${employee.must_change_password ? "초기 비밀번호" : "사용 중"}</small>
    </div>
  `).join("");
}

function roleText(role) {
  return {
    employee: "일반 직원",
    department_manager: "부서장",
    admin: "관리자",
  }[role] || role;
}
