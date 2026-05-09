import { escapeHtml } from "./trips.js";

export function renderDepartments(departments) {
  if (!departments.length) return `<div class="empty-state">등록된 부서가 없습니다.</div>`;
  return departments.map((department) => `
    <div class="compact-row editable-row" data-department-id="${escapeHtml(department.id)}">
      <label>
        부서명
        <input data-field="department-name" type="text" value="${escapeHtml(department.name)}" />
      </label>
      <label class="check-field">
        <input data-field="department-active" type="checkbox" ${department.is_active ? "checked" : ""} />
        사용
      </label>
      <div class="row-actions">
        <button class="button small" type="button" data-action="save-department">수정</button>
        <button class="button danger small" type="button" data-action="deactivate-department">삭제</button>
      </div>
    </div>
  `).join("");
}

export function renderEmployees(employees, departments) {
  if (!employees.length) return `<div class="empty-state">등록된 직원이 없습니다.</div>`;
  const departmentOptions = departments.map((department) => (
    `<option value="${escapeHtml(department.id)}">${escapeHtml(department.name)}${department.is_active ? "" : " (비활성)"}</option>`
  )).join("");

  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>직원명</th>
            <th>부서</th>
            <th>권한</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          ${employees.map((employee) => employeeRow(employee, departmentOptions)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function employeeRow(employee, departmentOptions) {
  const loginId = employee.login_id || employee.login_email?.split("@")[0] || "";
  return `
    <tr data-employee-id="${escapeHtml(employee.id)}">
      <td><input data-field="employee-login-id" type="text" value="${escapeHtml(loginId)}" readonly /></td>
      <td><input data-field="employee-name" type="text" value="${escapeHtml(employee.name)}" /></td>
      <td>
        <select data-field="employee-department">
          ${departmentOptions.replace(`value="${escapeHtml(employee.department_id)}"`, `value="${escapeHtml(employee.department_id)}" selected`)}
        </select>
      </td>
      <td>
        <select data-field="employee-role">
          ${roleOption("employee", "일반 직원", employee.role)}
          ${roleOption("department_manager", "부서장", employee.role)}
          ${roleOption("admin", "관리자", employee.role)}
        </select>
      </td>
      <td>
        <label class="check-field table-check">
          <input data-field="employee-active" type="checkbox" ${employee.is_active ? "checked" : ""} />
          사용
        </label>
        <label class="check-field table-check">
          <input data-field="employee-must-change-password" type="checkbox" ${employee.must_change_password ? "checked" : ""} />
          초기 비밀번호
        </label>
      </td>
      <td>
        <div class="row-actions">
          <button class="button small" type="button" data-action="save-employee">수정</button>
          <button class="button danger small" type="button" data-action="deactivate-employee">삭제</button>
        </div>
      </td>
    </tr>
  `;
}

function roleOption(value, label, selectedRole) {
  return `<option value="${value}" ${value === selectedRole ? "selected" : ""}>${label}</option>`;
}
