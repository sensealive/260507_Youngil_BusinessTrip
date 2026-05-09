import { clearRuntimeConfig, hasEffectiveSupabaseConfig, loadRuntimeConfig, saveRuntimeConfig } from "./config.js";
import { getSupabaseClient } from "./supabase.js";
import { changePassword, loadSignedInProfile, signInAsAdmin, signInSelectedEmployee, signOut } from "./auth.js";
import {
  cancelTrip,
  createDepartment,
  createEmployee,
  createTrip,
  deactivateDepartment,
  deactivateEmployee,
  fetchCountries,
  fetchDepartments,
  fetchEmployees,
  fetchTrips,
  markPasswordChanged,
  updateDepartment,
  updateEmployee,
  upsertDepartments,
  upsertEmployees,
  updateTrip,
} from "./store.js";
import { defaultTripScopeLabel, isAdmin, roleLabel } from "./permissions.js";
import { bindTripCardActions, clearTripForm, escapeHtml, fillTripForm, normalizeTripForm, renderCurrentTripCards, renderTripCards } from "./trips.js";
import { buildStats, isTripCurrent } from "./stats.js";
import { renderDepartments, renderEmployees } from "./admin.js";
import { normalizeEmployeeLoginId, resolveAuthEmailFromEmployeeId } from "./config.js";
import { createEmployeeAuthUser } from "./auth.js";

const state = {
  client: null,
  profile: null,
  departments: [],
  employees: [],
  countries: [],
  trips: [],
};

const els = {
  messageBox: document.querySelector("#messageBox"),
  messageText: document.querySelector("#messageText"),
  messageCopyButton: document.querySelector("#messageCopyButton"),
  adminLoginOverlay: document.querySelector("#adminLoginOverlay"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminDialogClose: document.querySelector("#adminDialogClose"),
  adminClearConfigButton: document.querySelector("#adminClearConfigButton"),
  adminConfigUrl: document.querySelector("#adminConfigUrl"),
  adminConfigAnonKey: document.querySelector("#adminConfigAnonKey"),
  adminIdInput: document.querySelector("#adminIdInput"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminLoginButton: document.querySelector("#adminLoginButton"),
  loginPanel: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  departmentSelect: document.querySelector("#departmentSelect"),
  employeeLoginIdInput: document.querySelector("#employeeLoginIdInput"),
  passwordInput: document.querySelector("#passwordInput"),
  dashboard: document.querySelector("#dashboard"),
  authLinkButton: document.querySelector("#authLinkButton"),
  welcomeTitle: document.querySelector("#welcomeTitle"),
  roleSummary: document.querySelector("#roleSummary"),
  currentTripCount: document.querySelector("#currentTripCount"),
  myTripCount: document.querySelector("#myTripCount"),
  visibleTripCount: document.querySelector("#visibleTripCount"),
  tripForm: document.querySelector("#tripForm"),
  tripFormTitle: document.querySelector("#tripFormTitle"),
  tripListTitle: document.querySelector("#tripListTitle"),
  tripList: document.querySelector("#tripList"),
  currentTripList: document.querySelector("#currentTripList"),
  countrySelect: document.querySelector("#countrySelect"),
  resetTripFormButton: document.querySelector("#resetTripFormButton"),
  refreshButton: document.querySelector("#refreshButton"),
  statsGrid: document.querySelector("#statsGrid"),
  departmentForm: document.querySelector("#departmentForm"),
  departmentName: document.querySelector("#departmentName"),
  departmentList: document.querySelector("#departmentList"),
  departmentExportButton: document.querySelector("#departmentExportButton"),
  departmentImportButton: document.querySelector("#departmentImportButton"),
  departmentImportFile: document.querySelector("#departmentImportFile"),
  employeeForm: document.querySelector("#employeeForm"),
  adminDepartmentSelect: document.querySelector("#adminDepartmentSelect"),
  employeeLoginId: document.querySelector("#employeeLoginId"),
  employeeInitialPassword: document.querySelector("#employeeInitialPassword"),
  employeeList: document.querySelector("#employeeList"),
  employeeBulkSaveButton: document.querySelector("#employeeBulkSaveButton"),
  employeeExportButton: document.querySelector("#employeeExportButton"),
  employeeImportButton: document.querySelector("#employeeImportButton"),
  employeeImportFile: document.querySelector("#employeeImportFile"),
  passwordForm: document.querySelector("#passwordForm"),
  newPassword: document.querySelector("#newPassword"),
  confirmPassword: document.querySelector("#confirmPassword"),
};

const tripFormFields = {
  tripId: document.querySelector("#tripId"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  country: document.querySelector("#countrySelect"),
  companyName: document.querySelector("#companyName"),
  city: document.querySelector("#city"),
  note: document.querySelector("#note"),
};

init();

async function init() {
  bindEvents();
  els.loginPanel.classList.remove("hidden");
  els.dashboard.classList.add("hidden");
  await bootSupabase();
}

function bindEvents() {
  els.messageCopyButton.addEventListener("click", copyCurrentMessage);
  els.adminLoginButton.addEventListener("click", () => openAdminLogin());
  els.adminDialogClose.addEventListener("click", () => closeAdminLogin());
  els.adminClearConfigButton.addEventListener("click", () => {
    clearRuntimeConfig();
    closeAdminLogin();
    location.reload();
  });
  els.adminLoginOverlay.addEventListener("click", (event) => {
    if (event.target === els.adminLoginOverlay) closeAdminLogin();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (els.adminLoginOverlay.classList.contains("hidden")) return;
    closeAdminLogin();
  });
  els.adminLoginForm.addEventListener("submit", handleAdminLoginSubmit);

  els.authLinkButton.addEventListener("click", handleAuthLinkClick);
  els.departmentSelect.addEventListener("change", () => {
    els.employeeLoginIdInput.value = "";
  });
  els.loginForm.addEventListener("submit", handleLogin);
  els.refreshButton.addEventListener("click", refreshAppData);
  els.tripForm.addEventListener("submit", handleTripSubmit);
  els.resetTripFormButton.addEventListener("click", resetTripForm);
  els.departmentForm.addEventListener("submit", handleDepartmentSubmit);
  els.departmentList.addEventListener("click", handleDepartmentListClick);
  els.departmentExportButton.addEventListener("click", exportDepartments);
  els.departmentImportButton.addEventListener("click", () => els.departmentImportFile.click());
  els.departmentImportFile.addEventListener("change", handleDepartmentImport);
  els.employeeForm.addEventListener("submit", handleEmployeeSubmit);
  els.employeeList.addEventListener("click", handleEmployeeListClick);
  els.employeeBulkSaveButton.addEventListener("click", handleEmployeeBulkSave);
  els.employeeExportButton.addEventListener("click", exportEmployees);
  els.employeeImportButton.addEventListener("click", () => els.employeeImportFile.click());
  els.employeeImportFile.addEventListener("change", handleEmployeeImport);
  els.passwordForm.addEventListener("submit", handlePasswordSubmit);

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
}

function fillAdminDialogFromConfig() {
  const config = loadRuntimeConfig();
  els.adminConfigUrl.value = config.url || "";
  els.adminConfigAnonKey.value = config.anonKey || "";
}

function openAdminLogin() {
  fillAdminDialogFromConfig();
  els.adminLoginOverlay.classList.remove("hidden");
  window.requestAnimationFrame(() => {
    const config = loadRuntimeConfig();
    if (hasEffectiveSupabaseConfig(config)) {
      els.adminIdInput.focus();
    } else {
      els.adminConfigUrl.focus();
    }
  });
}

function closeAdminLogin() {
  els.adminLoginOverlay.classList.add("hidden");
}

async function handleAdminLoginSubmit(event) {
  event.preventDefault();
  try {
    saveRuntimeConfig({
      url: els.adminConfigUrl.value,
      anonKey: els.adminConfigAnonKey.value,
    });
    state.client = await getSupabaseClient();
    await signInAsAdmin(state.client, els.adminIdInput.value, els.adminPasswordInput.value);
    els.adminPasswordInput.value = "";
    state.profile = await loadSignedInProfile(state.client);
    if (!state.profile) throw new Error("로그인 계정과 직원 정보가 연결되어 있지 않습니다.");
    if (!isAdmin(state.profile)) {
      await signOut(state.client);
      state.profile = null;
      throw new Error("관리자 권한이 아닌 계정입니다.");
    }
    closeAdminLogin();
    await enterDashboard();
    activateTab("adminSection");
    showMessage("관리자로 로그인했습니다.", "success");
  } catch (error) {
    showMessage(error.message || "관리자 로그인에 실패했습니다.", "error");
  }
}

async function bootSupabase() {
  try {
    if (!hasEffectiveSupabaseConfig()) {
      state.client = null;
      state.departments = [];
      state.employees = [];
      populateDepartmentSelects();
      state.profile = null;
      showLogin();
      showMessage("우측 상단 «관리자 로그인»에서 Supabase 연결 정보를 저장한 뒤 이용할 수 있습니다.", "info");
      return;
    }
    state.client = await getSupabaseClient();
    await loadPublicLoginData();
    state.profile = await loadSignedInProfile(state.client);
    if (state.profile) {
      await enterDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    state.client = null;
    state.departments = [];
    state.employees = [];
    populateDepartmentSelects();
    state.profile = null;
    showLogin();
    showMessage(error.message || "서버 연결에 실패했습니다. 관리자 로그인에서 설정을 확인하세요.", "error");
  }
}

async function loadPublicLoginData() {
  state.departments = await fetchDepartments(state.client);
  state.employees = await fetchEmployees(state.client);
  populateDepartmentSelects();
}

function populateDepartmentSelects() {
  const options = state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`).join("");
  els.departmentSelect.innerHTML = `<option value="">부서 선택</option>${options}`;
  els.adminDepartmentSelect.innerHTML = `<option value="">부서 선택</option>${options}`;
}

async function handleLogin(event) {
  event.preventDefault();
  if (!state.client) {
    showMessage("연결 정보가 없습니다. 우측 상단 «관리자 로그인»에서 Supabase URL·키를 저장해 주세요.", "error");
    return;
  }
  const loginId = normalizeEmployeeLoginId(els.employeeLoginIdInput.value);
  const employee = state.employees.find((item) => (
    item.department_id === els.departmentSelect.value
    && normalizeEmployeeLoginId(item.login_id || item.login_email?.split("@")[0]) === loginId
  ));
  if (!employee) {
    showMessage("부서와 ID가 일치하는 직원을 찾지 못했습니다.", "error");
    return;
  }
  try {
    await signInSelectedEmployee(state.client, employee, els.passwordInput.value);
    els.employeeLoginIdInput.value = "";
    els.passwordInput.value = "";
    state.profile = await loadSignedInProfile(state.client);
    if (!state.profile) throw new Error("로그인 계정과 직원 정보가 연결되어 있지 않습니다.");
    await enterDashboard();
    showMessage("로그인했습니다.", "success");
  } catch (error) {
    showMessage(error.message || "로그인에 실패했습니다.", "error");
  }
}

async function handleAuthLinkClick() {
  if (state.profile) {
    await handleLogout();
    return;
  }
  showLogin();
  els.loginPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function enterDashboard() {
  els.loginPanel.classList.add("hidden");
  els.dashboard.classList.remove("hidden");
  els.adminLoginButton.classList.add("hidden");
  els.authLinkButton.textContent = "로그아웃";
  els.authLinkButton.setAttribute("aria-label", `${state.profile.name}님 로그아웃`);
  els.welcomeTitle.textContent = `${state.profile.name}님, 안녕하세요.`;
  els.roleSummary.textContent = `${departmentName(state.profile.department_id)} / ${roleLabel(state.profile.role)} 권한으로 조회합니다.`;
  document.querySelectorAll(".admin-only").forEach((el) => el.classList.toggle("hidden", !isAdmin(state.profile)));
  await refreshAppData();
  if (state.profile.must_change_password) {
    activateTab("passwordSection");
    showMessage("초기 비밀번호 상태입니다. 새 비밀번호로 변경해 주세요.", "info");
  }
}

function showLogin() {
  els.loginPanel.classList.remove("hidden");
  els.dashboard.classList.add("hidden");
  els.adminLoginButton.classList.remove("hidden");
  els.authLinkButton.textContent = "로그인";
  els.authLinkButton.setAttribute("aria-label", "로그인 화면으로 이동");
}

async function refreshAppData() {
  try {
    state.departments = await fetchDepartments(state.client, { includeInactive: isAdmin(state.profile) });
    state.employees = await fetchEmployees(state.client, { includeInactive: isAdmin(state.profile) });
    state.countries = await fetchCountries(state.client);
    state.trips = await fetchTrips(state.client, state.profile);
    populateDepartmentSelects();
    populateCountrySelect();
    renderAll();
  } catch (error) {
    console.error(error);
    showMessage(error.message || "데이터를 불러오지 못했습니다.", "error");
  }
}

function populateCountrySelect() {
  els.countrySelect.innerHTML = `<option value="">국가 선택</option>${state.countries.map((country) => `<option value="${escapeHtml(country.name)}">${escapeHtml(country.name)}</option>`).join("")}`;
}

function renderAll() {
  const employeesById = new Map(state.employees.map((employee) => [employee.id, employee]));
  const departmentsById = new Map(state.departments.map((department) => [department.id, department]));

  const myTrips = state.trips.filter((trip) => trip.employee_id === state.profile.id);
  const currentTrips = state.trips.filter((trip) => isTripCurrent(trip));
  els.currentTripCount.textContent = currentTrips.length;
  els.myTripCount.textContent = myTrips.length;
  els.visibleTripCount.textContent = state.trips.length;
  els.tripListTitle.textContent = defaultTripScopeLabel(state.profile);

  els.tripList.innerHTML = renderTripCards({
    trips: state.trips,
    profile: state.profile,
    employeesById,
    departmentsById,
  });
  bindTripCardActions(els.tripList, { onEdit: startEditTrip, onCancel: handleTripCancel });
  els.currentTripList.innerHTML = renderCurrentTripCards({ trips: state.trips, employeesById, departmentsById });
  renderStats(employeesById, departmentsById);
  renderAdmin(departmentsById);
}

function renderStats(employeesById, departmentsById) {
  const stats = buildStats(state.trips, employeesById, departmentsById);
  els.statsGrid.innerHTML = [
    statGroup("연도별", stats.byYear),
    statGroup("부서별", stats.byDepartment),
    statGroup("직원별", stats.byEmployee),
    statGroup("국가별", stats.byCountry),
  ].join("");
}

function statGroup(title, rows) {
  const body = rows.length
    ? rows.map((row) => `<li><span>${escapeHtml(row.label)}</span><strong>${row.days}일</strong><small>${row.tripCount}건</small></li>`).join("")
    : `<li class="empty">통계 데이터가 없습니다.</li>`;
  return `<section class="stat-group"><h3>${escapeHtml(title)}</h3><ul>${body}</ul></section>`;
}

function renderAdmin(departmentsById) {
  if (!isAdmin(state.profile)) return;
  els.departmentList.innerHTML = renderDepartments(state.departments);
  els.employeeList.innerHTML = renderEmployees(state.employees, state.departments);
}

async function handleTripSubmit(event) {
  event.preventDefault();
  try {
    const payload = normalizeTripForm(tripFormFields);
    if (tripFormFields.tripId.value) {
      await updateTrip(state.client, tripFormFields.tripId.value, payload);
      showMessage("출장 정보를 수정했습니다.", "success");
    } else {
      await createTrip(state.client, state.profile, payload);
      showMessage("출장 정보를 등록했습니다.", "success");
    }
    resetTripForm();
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "출장 정보를 저장하지 못했습니다.", "error");
  }
}

function startEditTrip(tripId) {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return;
  fillTripForm(tripFormFields, trip);
  els.tripFormTitle.textContent = "출장 수정";
  activateTab("tripsSection");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleTripCancel(tripId) {
  if (!confirm("이 출장 정보를 취소 처리할까요?")) return;
  try {
    await cancelTrip(state.client, tripId);
    showMessage("출장 정보를 취소 처리했습니다.", "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "취소 처리에 실패했습니다.", "error");
  }
}

function resetTripForm() {
  clearTripForm(tripFormFields);
  els.tripFormTitle.textContent = "출장 등록";
}

async function handleDepartmentSubmit(event) {
  event.preventDefault();
  if (!isAdmin(state.profile)) return;
  try {
    await createDepartment(state.client, els.departmentName.value);
    els.departmentName.value = "";
    showMessage("부서를 추가했습니다.", "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "부서를 추가하지 못했습니다.", "error");
  }
}

async function handleDepartmentListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || !isAdmin(state.profile)) return;
  const row = button.closest("[data-department-id]");
  if (!row) return;

  const departmentId = row.dataset.departmentId;
  try {
    if (button.dataset.action === "save-department") {
      await updateDepartment(state.client, departmentId, {
        name: row.querySelector('[data-field="department-name"]').value,
        isActive: row.querySelector('[data-field="department-active"]').checked,
      });
      showMessage("부서 정보를 수정했습니다.", "success");
    }
    if (button.dataset.action === "deactivate-department") {
      if (!confirm("이 부서를 삭제 처리할까요? 기존 출장 기록 보존을 위해 비활성화됩니다.")) return;
      await deactivateDepartment(state.client, departmentId);
      showMessage("부서를 비활성화했습니다.", "success");
    }
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "부서 정보를 저장하지 못했습니다.", "error");
  }
}

async function handleEmployeeSubmit(event) {
  event.preventDefault();
  if (!isAdmin(state.profile)) return;
  try {
    const loginId = normalizeEmployeeLoginId(els.employeeLoginId.value);
    const loginEmail = resolveAuthEmailFromEmployeeId(loginId);
    const authUserId = await createEmployeeAuthUser(loginEmail, els.employeeInitialPassword.value);
    await createEmployee(state.client, {
      departmentId: els.adminDepartmentSelect.value,
      loginId,
      name: document.querySelector("#employeeName").value,
      loginEmail,
      authUserId,
      role: document.querySelector("#employeeRole").value,
    });
    els.employeeForm.reset();
    showMessage("직원을 등록했습니다.", "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "직원 정보를 저장하지 못했습니다.", "error");
  }
}

async function handleEmployeeListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || !isAdmin(state.profile)) return;
  const row = button.closest("[data-employee-id]");
  if (!row) return;

  const employeeId = row.dataset.employeeId;
  try {
    if (button.dataset.action === "save-employee") {
      await updateEmployee(state.client, employeeId, readEmployeeRow(row));
      showMessage("직원 정보를 수정했습니다.", "success");
    }
    if (button.dataset.action === "deactivate-employee") {
      if (!confirm("이 직원을 삭제 처리할까요? 기존 출장 기록 보존을 위해 비활성화됩니다.")) return;
      await deactivateEmployee(state.client, employeeId);
      showMessage("직원을 비활성화했습니다.", "success");
    }
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "직원 정보를 저장하지 못했습니다.", "error");
  }
}

async function handleEmployeeBulkSave() {
  if (!isAdmin(state.profile)) return;
  const rows = Array.from(els.employeeList.querySelectorAll("[data-employee-id]"));
  if (!rows.length) {
    showMessage("저장할 직원 정보가 없습니다.", "info");
    return;
  }
  try {
    for (const row of rows) {
      await updateEmployee(state.client, row.dataset.employeeId, readEmployeeRow(row));
    }
    showMessage(`직원 ${rows.length}명의 정보를 저장했습니다.`, "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "직원 정보를 일괄 저장하지 못했습니다.", "error");
  }
}

function readEmployeeRow(row) {
  const existingEmployee = state.employees.find((employee) => employee.id === row.dataset.employeeId);
  const loginId = normalizeEmployeeLoginId(existingEmployee.login_id || existingEmployee.login_email?.split("@")[0]);
  return {
    departmentId: row.querySelector('[data-field="employee-department"]').value,
    name: row.querySelector('[data-field="employee-name"]').value,
    role: row.querySelector('[data-field="employee-role"]').value,
    loginId,
    loginEmail: resolveAuthEmailFromEmployeeId(loginId),
    authUserId: existingEmployee.auth_user_id,
    isActive: row.querySelector('[data-field="employee-active"]').checked,
    mustChangePassword: row.querySelector('[data-field="employee-must-change-password"]').checked,
  };
}

function exportDepartments() {
  const rows = state.departments.map((department) => ({
    name: department.name,
    is_active: department.is_active,
  }));
  downloadSheet("youngil_departments.xls", rows, ["name", "is_active"]);
}

async function handleDepartmentImport(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !isAdmin(state.profile)) return;

  try {
    const rows = parseCsv(await file.text());
    const payload = rows.map((row, index) => {
      const name = requiredCell(row, "name", index);
      return {
        name,
        is_active: parseBoolean(row.is_active, true),
      };
    });
    await upsertDepartments(state.client, payload);
    showMessage(`부서 ${payload.length}건을 업로드했습니다.`, "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "부서 업로드에 실패했습니다.", "error");
  }
}

function exportEmployees() {
  const departmentsById = new Map(state.departments.map((department) => [department.id, department]));
  const rows = state.employees.map((employee) => ({
    department: departmentsById.get(employee.department_id)?.name || "",
    login_id: employee.login_id || employee.login_email?.split("@")[0] || "",
    name: employee.name,
    role: employee.role,
    password: "",
    is_active: employee.is_active,
    must_change_password: employee.must_change_password,
  }));
  downloadSheet("youngil_employees.xls", rows, [
    "department",
    "login_id",
    "name",
    "password",
    "role",
    "is_active",
    "must_change_password",
  ]);
}

async function handleEmployeeImport(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !isAdmin(state.profile)) return;

  try {
    const rows = parseCsv(await file.text());
    const departmentsByName = new Map(state.departments.map((department) => [department.name, department]));
    const employeesByLoginId = new Map(state.employees.map((employee) => [
      normalizeEmployeeLoginId(employee.login_id || employee.login_email?.split("@")[0]),
      employee,
    ]));
    const payload = [];

    for (const [index, row] of rows.entries()) {
      const departmentNameValue = requiredCell(row, "department", index);
      const department = departmentsByName.get(departmentNameValue);
      if (!department) {
        throw new Error(`${index + 2}행: 부서 '${departmentNameValue}'를 먼저 등록하세요.`);
      }
      const loginId = normalizeEmployeeLoginId(requiredCell(row, "login_id", index));
      const existingEmployee = employeesByLoginId.get(loginId);
      let authUserId = existingEmployee?.auth_user_id;
      if (!authUserId) {
        const password = requiredCell(row, "password", index);
        authUserId = await createEmployeeAuthUser(resolveAuthEmailFromEmployeeId(loginId), password);
      }
      payload.push({
        department_id: department.id,
        login_id: loginId,
        name: requiredCell(row, "name", index),
        role: normalizeRole(row.role, index),
        login_email: resolveAuthEmailFromEmployeeId(loginId),
        auth_user_id: authUserId,
        is_active: parseBoolean(row.is_active, true),
        must_change_password: parseBoolean(row.must_change_password, true),
      });
    }
    await upsertEmployees(state.client, payload);
    showMessage(`직원 ${payload.length}건을 업로드했습니다.`, "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "직원 업로드에 실패했습니다.", "error");
  }
}

function downloadSheet(filename, rows, columns) {
  const text = [
    columns.join("\t"),
    ...rows.map((row) => columns.map((column) => sheetCell(row[column])).join("\t")),
  ].join("\r\n");
  const blob = new Blob([encodeUtf16Le(text)], { type: "application/vnd.ms-excel;charset=utf-16le" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sheetCell(value) {
  const text = String(value ?? "");
  return text.replaceAll("\t", " ").replaceAll("\r", " ").replaceAll("\n", " ");
}

function encodeUtf16Le(text) {
  const buffer = new ArrayBuffer((text.length + 1) * 2);
  const view = new DataView(buffer);
  view.setUint16(0, 0xfeff, true);
  for (let i = 0; i < text.length; i += 1) {
    view.setUint16((i + 1) * 2, text.charCodeAt(i), true);
  }
  return buffer;
}

function parseCsv(text) {
  const normalizedText = text.replace(/^\ufeff/, "");
  const firstLine = normalizedText.split(/\r?\n/, 1)[0] || "";
  if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    return rowsToObjects(
      normalizedText
        .split(/\r?\n/)
        .map((line) => line.split("\t").map((cell) => cell.trim()))
        .filter((items) => items.some(Boolean))
    );
  }

  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = normalizedText;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);

  const nonEmptyRows = rows.filter((items) => items.some((item) => item.trim()));
  return rowsToObjects(nonEmptyRows);
}

function rowsToObjects(rows) {
  if (rows.length < 2) throw new Error("업로드할 데이터가 없습니다.");
  const firstRow = rows[0].map((item) => item.trim());
  const hasHeader = firstRow.includes("department") || firstRow.includes("login_id") || firstRow.includes("name");
  const headers = hasHeader
    ? firstRow
    : ["department", "login_id", "name", "password", "role", "is_active", "must_change_password"];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows.map((items) => Object.fromEntries(headers.map((header, index) => [header, (items[index] || "").trim()])));
}

function requiredCell(row, key, index) {
  const value = String(row[key] || "").trim();
  if (!value) throw new Error(`${index + 2}행: '${key}' 값이 필요합니다.`);
  return value;
}

function parseBoolean(value, defaultValue) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return defaultValue;
  return ["1", "true", "yes", "y", "사용", "활성"].includes(text);
}

function normalizeRole(value, index) {
  const role = String(value || "employee").trim();
  if (["employee", "department_manager", "admin"].includes(role)) return role;
  const roleMap = {
    일반직원: "employee",
    직원: "employee",
    일반: "employee",
    부서장: "department_manager",
    관리자: "admin",
  };
  if (roleMap[role]) return roleMap[role];
  throw new Error(`${index + 2}행: role은 employee, department_manager, admin 중 하나여야 합니다.`);
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  const newPassword = els.newPassword.value;
  const confirmPassword = els.confirmPassword.value;
  if (newPassword.length < 6) {
    showMessage("새 비밀번호는 6자 이상이어야 합니다.", "error");
    return;
  }
  if (newPassword !== confirmPassword) {
    showMessage("새 비밀번호 확인이 일치하지 않습니다.", "error");
    return;
  }
  try {
    await changePassword(state.client, newPassword);
    await markPasswordChanged(state.client);
    els.passwordForm.reset();
    showMessage("비밀번호를 변경했습니다.", "success");
    await refreshAppData();
  } catch (error) {
    if (error?.message?.includes("New password should be different")) {
      showMessage("새 비밀번호는 이전 비밀번호와 달라야 합니다.", "error");
      return;
    }
    showMessage(error.message || "비밀번호 변경에 실패했습니다.", "error");
  }
}

async function handleLogout() {
  try {
    if (state.client) await signOut(state.client);
    state.profile = null;
    state.trips = [];
    showLogin();
    if (state.client && hasEffectiveSupabaseConfig()) {
      await loadPublicLoginData();
    }
    showMessage("로그아웃했습니다.", "success");
  } catch (error) {
    showMessage(error.message || "로그아웃에 실패했습니다.", "error");
  }
}

function activateTab(targetId) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === targetId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== targetId);
  });
}

function showMessage(message, type = "info") {
  els.messageBox.dataset.message = message;
  els.messageText.textContent = message;
  els.messageCopyButton.textContent = "복사";
  els.messageBox.className = `message ${type}`;
  els.messageBox.classList.remove("hidden");
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => els.messageBox.classList.add("hidden"), 3000);
}

async function copyCurrentMessage() {
  const message = els.messageBox.dataset.message || els.messageText.textContent;
  if (!message) return;
  try {
    await navigator.clipboard.writeText(message);
    els.messageCopyButton.textContent = "완료";
    window.clearTimeout(showMessage.timer);
    showMessage.timer = window.setTimeout(() => els.messageBox.classList.add("hidden"), 3000);
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = message;
    textArea.setAttribute("readonly", "");
    textArea.className = "copy-helper";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    els.messageCopyButton.textContent = "완료";
    window.clearTimeout(showMessage.timer);
    showMessage.timer = window.setTimeout(() => els.messageBox.classList.add("hidden"), 3000);
  }
}

function departmentName(departmentId) {
  return state.departments.find((department) => department.id === departmentId)?.name || "미지정 부서";
}
