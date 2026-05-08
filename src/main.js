import { clearRuntimeConfig, hasRuntimeConfig, loadRuntimeConfig, saveRuntimeConfig } from "./config.js";
import { getSupabaseClient } from "./supabase.js";
import { changePassword, loadSignedInProfile, signInSelectedEmployee, signOut } from "./auth.js";
import {
  cancelTrip,
  createDepartment,
  createEmployee,
  createTrip,
  fetchCountries,
  fetchDepartments,
  fetchEmployees,
  fetchTrips,
  markPasswordChanged,
  updateTrip,
} from "./store.js";
import { defaultTripScopeLabel, isAdmin, roleLabel } from "./permissions.js";
import { bindTripCardActions, clearTripForm, escapeHtml, fillTripForm, normalizeTripForm, renderCurrentTripCards, renderTripCards } from "./trips.js";
import { buildStats, isTripCurrent } from "./stats.js";
import { renderDepartments, renderEmployees } from "./admin.js";

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
  setupPanel: document.querySelector("#setupPanel"),
  configForm: document.querySelector("#configForm"),
  configUrl: document.querySelector("#configUrl"),
  configAnonKey: document.querySelector("#configAnonKey"),
  clearConfigButton: document.querySelector("#clearConfigButton"),
  loginPanel: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  departmentSelect: document.querySelector("#departmentSelect"),
  employeeSelect: document.querySelector("#employeeSelect"),
  passwordInput: document.querySelector("#passwordInput"),
  showSetupButton: document.querySelector("#showSetupButton"),
  dashboard: document.querySelector("#dashboard"),
  sessionBadge: document.querySelector("#sessionBadge"),
  logoutButton: document.querySelector("#logoutButton"),
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
  employeeForm: document.querySelector("#employeeForm"),
  adminDepartmentSelect: document.querySelector("#adminDepartmentSelect"),
  employeeList: document.querySelector("#employeeList"),
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
  fillConfigForm();

  if (!hasRuntimeConfig()) {
    showSetup(true);
    showMessage("Supabase 설정을 입력하면 앱을 시작할 수 있습니다.", "info");
    return;
  }

  await bootSupabase();
}

function bindEvents() {
  els.configForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveRuntimeConfig({ url: els.configUrl.value, anonKey: els.configAnonKey.value });
    showMessage("Supabase 설정을 저장했습니다.", "success");
    await bootSupabase();
  });

  els.clearConfigButton.addEventListener("click", () => {
    clearRuntimeConfig();
    location.reload();
  });

  els.showSetupButton.addEventListener("click", () => showSetup(true));
  els.departmentSelect.addEventListener("change", populateEmployeeSelect);
  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutButton.addEventListener("click", handleLogout);
  els.refreshButton.addEventListener("click", refreshAppData);
  els.tripForm.addEventListener("submit", handleTripSubmit);
  els.resetTripFormButton.addEventListener("click", resetTripForm);
  els.departmentForm.addEventListener("submit", handleDepartmentSubmit);
  els.employeeForm.addEventListener("submit", handleEmployeeSubmit);
  els.passwordForm.addEventListener("submit", handlePasswordSubmit);

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
}

function fillConfigForm() {
  const config = loadRuntimeConfig();
  els.configUrl.value = config.url || "";
  els.configAnonKey.value = config.anonKey || "";
}

async function bootSupabase() {
  try {
    state.client = getSupabaseClient();
    showSetup(false);
    await loadPublicLoginData();
    state.profile = await loadSignedInProfile(state.client);
    if (state.profile) {
      await enterDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showSetup(true);
    showMessage(error.message || "Supabase 연결에 실패했습니다.", "error");
  }
}

async function loadPublicLoginData() {
  state.departments = await fetchDepartments(state.client);
  state.employees = await fetchEmployees(state.client);
  populateDepartmentSelects();
  populateEmployeeSelect();
}

function populateDepartmentSelects() {
  const options = state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`).join("");
  els.departmentSelect.innerHTML = `<option value="">부서 선택</option>${options}`;
  els.adminDepartmentSelect.innerHTML = `<option value="">부서 선택</option>${options}`;
}

function populateEmployeeSelect() {
  const departmentId = els.departmentSelect.value;
  const employees = state.employees.filter((employee) => employee.department_id === departmentId);
  els.employeeSelect.innerHTML = `<option value="">이름 선택</option>${employees.map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`).join("")}`;
}

async function handleLogin(event) {
  event.preventDefault();
  const employee = state.employees.find((item) => item.id === els.employeeSelect.value);
  try {
    await signInSelectedEmployee(state.client, employee, els.passwordInput.value);
    els.passwordInput.value = "";
    state.profile = await loadSignedInProfile(state.client);
    if (!state.profile) throw new Error("로그인 계정과 직원 정보가 연결되어 있지 않습니다.");
    await enterDashboard();
    showMessage("로그인했습니다.", "success");
  } catch (error) {
    showMessage(error.message || "로그인에 실패했습니다.", "error");
  }
}

async function enterDashboard() {
  els.loginPanel.classList.add("hidden");
  els.dashboard.classList.remove("hidden");
  els.logoutButton.classList.remove("hidden");
  els.sessionBadge.textContent = `${state.profile.name} · ${roleLabel(state.profile.role)}`;
  els.sessionBadge.className = "badge badge-live";
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
  els.logoutButton.classList.add("hidden");
  els.sessionBadge.textContent = "로그아웃";
  els.sessionBadge.className = "badge badge-muted";
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
  els.employeeList.innerHTML = renderEmployees(state.employees, departmentsById);
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

async function handleEmployeeSubmit(event) {
  event.preventDefault();
  if (!isAdmin(state.profile)) return;
  try {
    await createEmployee(state.client, {
      departmentId: els.adminDepartmentSelect.value,
      name: document.querySelector("#employeeName").value,
      loginEmail: document.querySelector("#employeeLoginEmail").value,
      authUserId: document.querySelector("#employeeAuthUid").value,
      role: document.querySelector("#employeeRole").value,
    });
    els.employeeForm.reset();
    showMessage("직원 정보를 저장했습니다. 비밀번호 자체는 Supabase 콘솔에서 관리하세요.", "success");
    await refreshAppData();
  } catch (error) {
    showMessage(error.message || "직원 정보를 저장하지 못했습니다.", "error");
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  const newPassword = els.newPassword.value;
  const confirmPassword = els.confirmPassword.value;
  if (newPassword.length < 4) {
    showMessage("새 비밀번호는 4자 이상이어야 합니다.", "error");
    return;
  }
  if (newPassword !== confirmPassword) {
    showMessage("새 비밀번호 확인이 일치하지 않습니다.", "error");
    return;
  }
  try {
    await changePassword(state.client, newPassword);
    await markPasswordChanged(state.client, state.profile.id);
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
    await signOut(state.client);
    state.profile = null;
    state.trips = [];
    showLogin();
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

function showSetup(show) {
  els.setupPanel.classList.toggle("hidden", !show);
}

function showMessage(message, type = "info") {
  els.messageBox.textContent = message;
  els.messageBox.className = `message ${type}`;
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => els.messageBox.classList.add("hidden"), 6000);
}

function departmentName(departmentId) {
  return state.departments.find((department) => department.id === departmentId)?.name || "미지정 부서";
}
