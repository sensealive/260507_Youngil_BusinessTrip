import { normalizeEmployeeLoginId, resolveAuthEmailFromEmployeeId } from "./config.js";
import { getSupabaseClient } from "./supabase.js";
import { ensureEmployeeAuthUser, loadSignedInProfile, signInAsAdmin, signInSelectedEmployee, signOut } from "./auth.js";
import {
  createCompany,
  createDepartment,
  createEmployee,
  createTrip,
  createTripForEmployee,
  cancelTrip,
  deactivateCompany,
  deactivateDepartment,
  deactivateEmployee,
  fetchCompanies,
  fetchCountries,
  fetchDepartments,
  fetchEmployees,
  fetchTrips,
  updateTrip,
  updateCompany,
  updateDepartment,
  updateEmployee,
} from "./store.js";

const DOMESTIC_COUNTRIES = new Set(["국내", "대한민국", "한국", "Korea", "South Korea"]);
const PAGE_SIZE = 15;
const EMPLOYEE_PAGE_SIZE = 15;
const EMPTY_POSITION_LABEL = "직급 미입력";
const EMPLOYEE_SHEET_HEADERS = ["department", "login_id", "name", "password", "position"];
const TRIP_SHEET_HEADERS = ["name", "position", "department", "country", "compay name", "company name", "start date", "end date"];

let xlsxModulePromise = null;

const state = {
  client: null,
  profile: null,
  departments: [],
  employees: [],
  countries: [],
  companies: [],
  trips: [],
  filter: "all",
  departmentFilter: "",
  page: 1,
  employeePage: 1,
  selectedEmployeeId: null,
  selectedTripId: null,
};

document.addEventListener("DOMContentLoaded", () => {
  boot().catch((error) => showError(error));
});

async function boot() {
  setupToasts();
  if (document.querySelector("#loginForm")) {
    setupLoginPage();
    return;
  }

  state.client = await getSupabaseClient();
  state.profile = await loadSignedInProfile(state.client);
  if (!state.profile) {
    location.href = "index.html";
    return;
  }

  renderCurrentUser();
  setupLogout();

  if (document.querySelector("#employeeTripForm")) await setupEmployeeTripPage();
  if (document.querySelector("#adminTripForm")) await setupAdminTripPage();
  if (document.querySelector("#departmentAddButton")) await setupManagePage();
}

function setupLoginPage() {
  const form = document.querySelector("#loginForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const loginId = document.querySelector("#loginId").value.trim();
    const password = document.querySelector("#loginPassword").value;
    if (!loginId || !password) {
      showToast("ID와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      state.client = await getSupabaseClient();
      if (normalizeEmployeeLoginId(loginId) === "admin") {
        await signInAsAdmin(state.client, "admin", password);
        const profile = await loadSignedInProfile(state.client);
        if (profile?.role !== "admin") throw new Error("관리자 권한이 없는 계정입니다.");
        location.href = "admin-business-trip.html";
        return;
      }

      const employees = await fetchEmployees(state.client, { includeInactive: false });
      const employee = employees.find((item) => item.login_id === normalizeEmployeeLoginId(loginId));
      if (!employee) throw new Error("등록된 직원 ID가 아닙니다.");
      await signInSelectedEmployee(state.client, employee, password);
      location.href = "business-trip.html";
    } catch (error) {
      showError(error);
    }
  });
}

async function setupEmployeeTripPage() {
  await loadReferenceData();
  await loadTrips();
  populateTripCountrySelect("#tripCountry", state.countries.map((item) => item.name), "국가선택");
  populateSelect("#tripCompany", state.companies.map((item) => item.name), "업체명 선택");
  populateDepartmentFilter();
  setupTripTabs();
  setupDepartmentFilter();
  setupEmployeeTripForm();
  setupTripUpload();
  setupTripDownload();
  setupTripDeleteButton();
  setupTripFormReset("#employeeTripForm");
  renderTripTable();
}

async function setupAdminTripPage() {
  requireAdmin();
  await loadReferenceData();
  await loadTrips();
  populateDepartmentSelect("#adminTripDepartment");
  populateEmployeeSelect();
  populateTripCountrySelect("#adminTripCountry", state.countries.map((item) => item.name), "국가선택");
  populateSelect("#adminTripCompany", state.companies.map((item) => item.name), "업체명 선택");
  setupAdminTripSelectors();
  setupTripTabs();
  setupAdminTripForm();
  setupTripUpload();
  setupTripDownload();
  setupAdminTripDeleteButton();
  setupTripFormReset("#adminTripForm");
  renderTripTable();
}

async function setupManagePage() {
  requireAdmin();
  await loadReferenceData();
  renderDepartmentList();
  renderEmployeeEditorDepartments();
  renderEmployeeList();
  renderCompanyList();
  setupDepartmentActions();
  setupEmployeeActions();
  setupCompanyActions();
}

async function loadReferenceData() {
  const [departments, employees, countries, companies] = await Promise.all([
    fetchDepartments(state.client, { includeInactive: true }),
    fetchEmployees(state.client, { includeInactive: true }),
    fetchCountries(state.client),
    fetchCompanies(state.client, { includeInactive: true }),
  ]);
  state.departments = departments;
  state.employees = employees;
  state.countries = countries;
  state.companies = companies;
}

async function loadTrips() {
  state.trips = await fetchTrips(state.client, state.profile);
}

function setupLogout() {
  document.querySelectorAll("[data-logout]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await signOut(state.client);
      } finally {
        location.href = "index.html";
      }
    });
  });
}

function renderCurrentUser() {
  const target = document.querySelector("[data-current-user]");
  if (!target) return;
  const dept = state.profile.departments?.name || "부서 미지정";
  const position = state.profile.position || (state.profile.role === "admin" ? "관리자" : "직급 미지정");
  target.innerHTML = `현재접속자: <strong>${escapeHtml(state.profile.name)}</strong> (${escapeHtml(position)}, ${escapeHtml(dept)})`;
}

function requireAdmin() {
  if (state.profile.role !== "admin") {
    showToast("관리자만 접근할 수 있는 페이지입니다.");
    location.href = "business-trip.html";
  }
}

function setupEmployeeTripForm() {
  document.querySelector("#employeeTripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const payload = readTripPayload();
      const selectedTrip = getSelectedTrip();
      const employeeId = selectedTrip?.employee_id || state.profile.id;
      if (hasOverlappingTrip(employeeId, payload.startDate, payload.endDate, selectedTrip?.id)) {
        throw new Error("같은 직원의 출장기간이 이미 등록된 출장과 겹칩니다.");
      }
      if (selectedTrip) {
        if (selectedTrip.employee_id !== state.profile.id) {
          throw new Error("본인이 등록한 출장만 수정할 수 있습니다.");
        }
        await updateTrip(state.client, selectedTrip.id, payload);
      } else {
        await createTrip(state.client, state.profile, payload);
      }
      form.reset();
      clearSelectedTrip();
      await loadTrips();
      renderTripTable();
      showToast("출장 정보가 저장되었습니다.");
    } catch (error) {
      showError(error);
    }
  });
}

function setupTripDeleteButton() {
  const button = document.querySelector("#tripDeleteButton");
  if (!button) return;
  button.addEventListener("click", async () => {
    const selectedTrip = getSelectedTrip();
    if (!selectedTrip) {
      showToast("삭제할 출장 행을 선택해주세요.");
      return;
    }
    if (selectedTrip.employee_id !== state.profile.id) {
      showToast("본인이 등록한 출장만 삭제할 수 있습니다.");
      return;
    }
    if (!confirm("선택한 출장 정보를 삭제할까요?")) return;
    try {
      await cancelTrip(state.client, selectedTrip.id);
      document.querySelector("#employeeTripForm")?.reset();
      clearSelectedTrip();
      await loadTrips();
      renderTripTable();
      showToast("출장 정보가 삭제되었습니다.");
    } catch (error) {
      showError(error);
    }
  });
}

function setupTripFormReset(selector) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener("reset", () => {
    setTimeout(clearSelectedTrip, 0);
  });
}

function setupAdminTripForm() {
  document.querySelector("#adminTripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const employee = getSelectedAdminTripEmployee();
    if (!employee) {
      showToast("직원을 선택해주세요.");
      return;
    }
    try {
      const payload = readTripPayload("adminTrip");
      const selectedTrip = getSelectedTrip();
      if (hasOverlappingTrip(employee.id, payload.startDate, payload.endDate, selectedTrip?.id)) {
        throw new Error("같은 직원의 출장기간이 이미 등록된 출장과 겹칩니다.");
      }
      if (selectedTrip) {
        await updateTrip(state.client, selectedTrip.id, {
          ...payload,
          employeeId: employee.id,
          departmentId: employee.department_id,
        });
      } else {
        await createTripForEmployee(
          state.client,
          { employeeId: employee.id, departmentId: employee.department_id },
          payload,
        );
      }
      form.reset();
      clearAdminEmployeePreview();
      clearSelectedTrip();
      await loadTrips();
      renderTripTable();
      showToast("출장 정보가 저장되었습니다.");
    } catch (error) {
      showError(error);
    }
  });
}

function setupTripUpload() {
  const button = document.querySelector("#tripUploadButton");
  const input = document.querySelector("#tripUploadInput");
  if (!button || !input) return;
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", uploadTripsXlsx);
}

function setupTripDownload() {
  const button = document.querySelector("#tripDownloadButton");
  if (!button) return;
  button.addEventListener("click", downloadTripsXlsx);
}

async function uploadTripsXlsx(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const rows = await parseTripXlsx(file);
    const results = { created: 0, skipped: 0, failed: 0 };
    const messages = [];
    for (const row of rows) {
      try {
        if (row.skipReason) {
          results.skipped += 1;
          messages.push(`${row.line}행 스킵: ${row.skipReason}`);
          continue;
        }

        const department = state.departments.find((item) => item.name === row.department);
        if (!department) throw new Error(`등록되지 않은 부서입니다. (${row.department})`);

        const employee = state.employees.find(
          (item) => item.name === row.name && item.department_id === department.id && item.is_active,
        );
        if (!employee) throw new Error(`등록된 직원을 찾을 수 없습니다. (${row.department} / ${row.name})`);

        if (hasOverlappingTrip(employee.id, row.startDate, row.endDate)) {
          results.skipped += 1;
          messages.push(`${row.line}행 스킵: ${row.name}의 출장기간이 기존 일정과 겹칩니다.`);
          continue;
        }

        const created = await createTripForEmployee(
          state.client,
          { employeeId: employee.id, departmentId: department.id },
          {
            startDate: row.startDate,
            endDate: row.endDate,
            country: row.country,
            companyName: row.companyName,
            city: "",
            note: "",
          },
        );
        state.trips.push(created);
        results.created += 1;
      } catch (error) {
        results.failed += 1;
        messages.push(`${row.line}행 실패: ${error.message}`);
      }
    }
    await loadTrips();
    state.page = 1;
    renderTripTable();
    showToast(`출장 업로드 완료: 등록 ${results.created}건, 스킵 ${results.skipped}건, 실패 ${results.failed}건${messages.length ? ` / ${messages.slice(0, 3).join(" | ")}` : ""}`);
  } catch (error) {
    showError(error);
  } finally {
    event.target.value = "";
  }
}

function setupAdminTripDeleteButton() {
  const button = document.querySelector("#adminTripDeleteButton");
  if (!button) return;
  button.addEventListener("click", async () => {
    const selectedTrip = getSelectedTrip();
    if (!selectedTrip) {
      showToast("삭제할 출장 행을 선택해주세요.");
      return;
    }
    if (!confirm("선택한 출장 정보를 삭제할까요?")) return;
    try {
      await cancelTrip(state.client, selectedTrip.id);
      document.querySelector("#adminTripForm")?.reset();
      clearAdminEmployeePreview();
      clearSelectedTrip();
      await loadTrips();
      renderTripTable();
      showToast("출장 정보가 삭제되었습니다.");
    } catch (error) {
      showError(error);
    }
  });
}

function readTripPayload(prefix = "trip") {
  const startDate = value(`#${prefix}StartDate`);
  const endDate = value(`#${prefix}EndDate`);
  const country = value(`#${prefix}Country`);
  const companyName = value(`#${prefix}Company`);
  if (!startDate || !endDate || !country || !companyName) {
    throw new Error("출장 시작일, 종료일, 국가, 방문업체명을 입력해주세요.");
  }
  return {
    startDate,
    endDate,
    country,
    companyName,
    city: value(`#${prefix}City`),
    note: value(`#${prefix}Note`),
  };
}

function setupAdminTripSelectors() {
  document.querySelector("#adminTripDepartment").addEventListener("change", populateEmployeeSelect);
  document.querySelector("#adminTripEmployee").addEventListener("change", renderAdminEmployeePreview);
}

function populateEmployeeSelect() {
  const departmentId = value("#adminTripDepartment");
  const employees = state.employees
    .filter(isTripAssignableEmployee)
    .filter((employee) => employee.is_active)
    .filter((employee) => !departmentId || employee.department_id === departmentId);
  const select = document.querySelector("#adminTripEmployee");
  select.innerHTML = `<option value="">직원 선택</option>${employees
    .map((employee) => `<option value="${employee.id}">${escapeHtml(employee.name)}</option>`)
    .join("")}`;
  clearAdminEmployeePreview();
}

function renderAdminEmployeePreview() {
  const employee = getSelectedAdminTripEmployee();
  document.querySelector("#adminTripPosition").value = displayPosition(employee);
  document.querySelector("#adminTripLoginId").value = employee?.login_id || "";
  document.querySelector("#adminTripEmail").value = employee?.login_email || "";
}

function clearAdminEmployeePreview() {
  ["#adminTripPosition", "#adminTripLoginId", "#adminTripEmail"].forEach((selector) => {
    const input = document.querySelector(selector);
    if (input) input.value = "";
  });
}

function getSelectedAdminTripEmployee() {
  const employeeId = value("#adminTripEmployee");
  return state.employees.find((employee) => employee.id === employeeId);
}

function setupTripTabs() {
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      state.filter = tab.getAttribute("href").replace("#", "") || "all";
      state.page = 1;
      clearSelectedTrip();
      document.querySelectorAll(".filter-tab").forEach((item) => item.classList.toggle("active", item === tab));
      renderTripTable();
    });
  });
}

function setupDepartmentFilter() {
  const select = document.querySelector("#tripDepartmentFilter");
  if (!select) return;
  select.addEventListener("change", () => {
    state.departmentFilter = select.value;
    state.page = 1;
    clearSelectedTrip();
    renderTripTable();
  });
}

function populateDepartmentFilter() {
  const select = document.querySelector("#tripDepartmentFilter");
  if (!select) return;
  select.innerHTML = `<option value="">부서전체</option>${state.departments
    .filter((department) => department.is_active)
    .map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
    .join("")}`;
}

function renderTripTable() {
  const tbody = document.querySelector("[data-trip-table]");
  if (!tbody) return;
  const rows = filteredTrips();
  const pageRows = paginate(rows, state.page);
  renderTripStats();
  if (!pageRows.length) {
    tbody.innerHTML = `<tr><td colspan="7">등록된 출장자가 없습니다.</td></tr>`;
    renderPagination(rows.length, renderTripTable);
    return;
  }
  tbody.innerHTML = pageRows
    .map((trip) => {
      const employee = state.employees.find((item) => item.id === trip.employee_id);
      if (!isTripAssignableEmployee(employee)) return "";
      const department = state.departments.find((item) => item.id === trip.department_id);
      return `<tr data-trip-id="${trip.id}" class="${trip.id === state.selectedTripId ? "selected-row" : ""}">
        <td>${escapeHtml(employee?.name || "-")}</td>
        <td>${escapeHtml(displayPosition(employee))}</td>
        <td>${escapeHtml(department?.name || "-")}</td>
        <td>${escapeHtml(trip.country || "-")}</td>
        <td>${escapeHtml(trip.company_name || "-")}</td>
        <td>${escapeHtml(formatTripPeriod(trip))}</td>
        <td>${escapeHtml(trip.note || "")}</td>
      </tr>`;
    })
    .join("");
  tbody.querySelectorAll("[data-trip-id]").forEach((row) => {
    row.addEventListener("click", () => selectTripForForm(row.dataset.tripId));
  });
  renderPagination(rows.length, renderTripTable);
}

function filteredTrips() {
  return state.trips.filter((trip) => {
    const employee = state.employees.find((item) => item.id === trip.employee_id);
    if (!isTripAssignableEmployee(employee)) return false;
    if (trip.status !== "active") return false;
    if (state.filter === "current") {
      if (!isCurrentTrip(trip)) return false;
    } else if (state.filter === "upcoming") {
      if (!isFutureTrip(trip)) return false;
    } else if (!isUpcomingOrCurrentTrip(trip)) {
      return false;
    }
    if (state.departmentFilter && trip.department_id !== state.departmentFilter) return false;
    const isDomestic = DOMESTIC_COUNTRIES.has(trip.country);
    if (state.filter === "domestic") return isDomestic;
    if (state.filter === "overseas") return !isDomestic;
    return true;
  });
}

function renderTripStats() {
  const target = document.querySelector("[data-trip-stats]");
  if (!target) return;
  const rows = statTargetTrips();
  const current = countUniqueTripEmployees(rows.filter(isCurrentTrip));
  const upcoming = countUniqueTripEmployees(rows.filter(isFutureTrip));
  const domestic = countUniqueTripEmployees(rows.filter((trip) => DOMESTIC_COUNTRIES.has(trip.country)));
  const overseas = countUniqueTripEmployees(rows.filter((trip) => !DOMESTIC_COUNTRIES.has(trip.country)));
  target.innerHTML = `<span>[출장중: ${current}명]</span><span>[출장예정: ${upcoming}명]</span><span>[국내출장: ${domestic}명]</span><span>[해외출장: ${overseas}명]</span>`;
}

function statTargetTrips() {
  return state.trips.filter((trip) => {
    const employee = state.employees.find((item) => item.id === trip.employee_id);
    if (!isTripAssignableEmployee(employee)) return false;
    if (trip.status !== "active") return false;
    if (!isUpcomingOrCurrentTrip(trip)) return false;
    if (state.departmentFilter && trip.department_id !== state.departmentFilter) return false;
    return true;
  });
}

function countUniqueTripEmployees(trips) {
  return new Set(trips.map((trip) => trip.employee_id)).size;
}

function isTripAssignableEmployee(employee) {
  if (!employee) return false;
  if (employee.role === "admin") return false;
  if (normalizeEmployeeLoginId(employee.login_id) === "admin") return false;
  return true;
}

function selectTripForForm(tripId) {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return;
  if (document.querySelector("#adminTripForm")) {
    selectTripForAdminForm(trip);
    return;
  }
  if (!document.querySelector("#employeeTripForm")) return;
  state.selectedTripId = trip.id;
  document.querySelector("#tripStartDate").value = trip.start_date || "";
  document.querySelector("#tripEndDate").value = trip.end_date || "";
  setSelectValue("#tripCountry", trip.country);
  setSelectValue("#tripCompany", trip.company_name);
  const cityInput = document.querySelector("#tripCity");
  if (cityInput) cityInput.value = trip.city || "";
  document.querySelector("#tripNote").value = trip.note || "";
  syncTripDeleteButton();
  renderTripTable();
}

function selectTripForAdminForm(trip) {
  const employee = state.employees.find((item) => item.id === trip.employee_id);
  if (!employee) return;
  state.selectedTripId = trip.id;
  document.querySelector("#adminTripDepartment").value = employee.department_id || "";
  populateEmployeeSelect();
  document.querySelector("#adminTripEmployee").value = employee.id || "";
  renderAdminEmployeePreview();
  document.querySelector("#adminTripStartDate").value = trip.start_date || "";
  document.querySelector("#adminTripEndDate").value = trip.end_date || "";
  setSelectValue("#adminTripCountry", trip.country);
  setSelectValue("#adminTripCompany", trip.company_name);
  const cityInput = document.querySelector("#adminTripCity");
  if (cityInput) cityInput.value = trip.city || "";
  document.querySelector("#adminTripNote").value = trip.note || "";
  syncTripDeleteButton();
  renderTripTable();
}

function clearSelectedTrip() {
  state.selectedTripId = null;
  syncTripDeleteButton();
  document.querySelectorAll("[data-trip-id]").forEach((row) => row.classList.remove("selected-row"));
}

function syncTripDeleteButton() {
  const selectedTrip = getSelectedTrip();
  const employeeButton = document.querySelector("#tripDeleteButton");
  if (employeeButton) {
    employeeButton.disabled = !selectedTrip || selectedTrip.employee_id !== state.profile?.id;
  }
  const adminButton = document.querySelector("#adminTripDeleteButton");
  if (adminButton) {
    adminButton.disabled = !selectedTrip;
  }
}

function getSelectedTrip() {
  if (!state.selectedTripId) return null;
  return state.trips.find((trip) => trip.id === state.selectedTripId) || null;
}

function setSelectValue(selector, nextValue) {
  const select = document.querySelector(selector);
  if (!select) return;
  if (nextValue && !Array.from(select.options).some((option) => option.value === nextValue)) {
    select.append(new Option(nextValue, nextValue));
  }
  select.value = nextValue || "";
}

function hasOverlappingTrip(employeeId, startDate, endDate, excludeTripId = null) {
  return state.trips.some((trip) => {
    if (trip.id === excludeTripId) return false;
    if (trip.employee_id !== employeeId) return false;
    if (trip.status !== "active") return false;
    return dateRangesOverlap(startDate, endDate, trip.start_date, trip.end_date);
  });
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

function isCurrentTrip(trip) {
  const today = todayString();
  return trip.start_date <= today && today <= trip.end_date;
}

function isFutureTrip(trip) {
  const today = todayString();
  return today < trip.start_date;
}

function isUpcomingOrCurrentTrip(trip) {
  const today = todayString();
  return today <= trip.end_date;
}

function setupDepartmentActions() {
  document.querySelector("#departmentAddButton").addEventListener("click", async () => {
    const name = value("#departmentNameInput");
    if (!name) return showToast("부서명을 입력해주세요.");
    try {
      await createDepartment(state.client, name);
      document.querySelector("#departmentNameInput").value = "";
      await refreshManageData();
      showToast("부서가 추가되었습니다.");
    } catch (error) {
      showError(error);
    }
  });
}

function renderDepartmentList() {
  const list = document.querySelector("#departmentList");
  if (!state.departments.length) {
    list.innerHTML = `<div class="manage-item"><span>등록된 부서가 없습니다.</span></div>`;
    return;
  }
  list.innerHTML = state.departments
    .map(
      (department) => `<div class="manage-item">
        <span>${escapeHtml(department.name)}</span>
        <button class="primary-button" data-edit-department="${department.id}" type="button">수정</button>
        <button class="warning-button" data-delete-department="${department.id}" type="button">삭제</button>
      </div>`,
    )
    .join("");
  list.querySelectorAll("[data-edit-department]").forEach((button) => {
    button.addEventListener("click", () => editDepartment(button.dataset.editDepartment));
  });
  list.querySelectorAll("[data-delete-department]").forEach((button) => {
    button.addEventListener("click", () => deleteDepartment(button.dataset.deleteDepartment));
  });
}

async function editDepartment(departmentId) {
  const department = state.departments.find((item) => item.id === departmentId);
  const nextName = prompt("부서명을 수정하세요.", department?.name || "");
  if (!nextName) return;
  try {
    await updateDepartment(state.client, departmentId, { name: nextName, isActive: true });
    await refreshManageData();
    showToast("부서가 수정되었습니다.");
  } catch (error) {
    showError(error);
  }
}

async function deleteDepartment(departmentId) {
  if (!confirm("이 부서를 삭제 처리할까요?")) return;
  try {
    await deactivateDepartment(state.client, departmentId);
    await refreshManageData();
    showToast("부서가 삭제 처리되었습니다.");
  } catch (error) {
    showError(error);
  }
}

function setupEmployeeActions() {
  document.querySelector("#employeeSaveButton").addEventListener("click", saveEmployee);
  document.querySelector("#employeeDownloadButton").addEventListener("click", downloadEmployeesXlsx);
  document.querySelector("#employeeUploadButton").addEventListener("click", () => document.querySelector("#employeeUploadInput").click());
  document.querySelector("#employeeUploadInput").addEventListener("change", uploadEmployeesXlsx);
}

function renderEmployeeEditorDepartments() {
  populateDepartmentSelect("#employeeDepartment");
}

function renderEmployeeList() {
  const tbody = document.querySelector("#employeeList");
  const activeEmployees = state.employees.filter((employee) => employee.is_active);
  if (!activeEmployees.length) {
    tbody.innerHTML = `<tr><td colspan="6">등록된 직원이 없습니다.</td></tr>`;
    renderEmployeePagination(0);
    return;
  }
  const pageRows = paginateBySize(activeEmployees, state.employeePage, EMPLOYEE_PAGE_SIZE);
  tbody.innerHTML = pageRows
    .map((employee, index) => {
      const department = state.departments.find((item) => item.id === employee.department_id);
      const rowNumber = (state.employeePage - 1) * EMPLOYEE_PAGE_SIZE + index + 1;
      return `<tr data-employee-id="${employee.id}">
        <td>${rowNumber}</td><td>${escapeHtml(employee.login_id || "")}</td><td>${escapeHtml(employee.name || "")}</td>
        <td>${escapeHtml(displayPosition(employee))}</td><td>${escapeHtml(department?.name || "")}</td>
        <td><button class="warning-button" data-delete-employee="${employee.id}" type="button">삭제</button></td>
      </tr>`;
    })
    .join("");
  tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => selectEmployeeForEdit(row.dataset.employeeId));
  });
  tbody.querySelectorAll("[data-delete-employee]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteEmployee(button.dataset.deleteEmployee);
    });
  });
  renderEmployeePagination(activeEmployees.length);
}

function selectEmployeeForEdit(employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  state.selectedEmployeeId = employeeId;
  document.querySelector("#employeeDepartment").value = employee.department_id || "";
  document.querySelector("#employeePosition").value = employee.position || "";
  document.querySelector("#employeeLoginId").value = employee.login_id || "";
  document.querySelector("#employeeName").value = employee.name || "";
  document.querySelector("#employeePassword").value = "";
}

async function saveEmployee() {
  const departmentId = value("#employeeDepartment");
  const position = value("#employeePosition");
  const loginId = normalizeEmployeeLoginId(value("#employeeLoginId"));
  const name = value("#employeeName");
  const password = value("#employeePassword");
  if (!departmentId || !position || !loginId || !name) return showToast("부서, 직급, ID, 직원명을 입력해주세요.");

  try {
    if (state.selectedEmployeeId) {
      const previous = state.employees.find((employee) => employee.id === state.selectedEmployeeId);
      const loginEmail = resolveAuthEmailFromEmployeeId(loginId);
      const authUserId = password ? await ensureEmployeeAuthUser(loginEmail, password) : previous.auth_user_id;
      await updateEmployee(state.client, state.selectedEmployeeId, {
        departmentId,
        position,
        name,
        role: previous.role || "employee",
        loginId,
        loginEmail,
        authUserId,
        isActive: true,
        mustChangePassword: previous.must_change_password ?? true,
      });
    } else {
      if (!password || password.length < 6) return showToast("초기 비밀번호는 6자리 이상 입력해주세요.");
      const loginEmail = resolveAuthEmailFromEmployeeId(loginId);
      const authUserId = await ensureEmployeeAuthUser(loginEmail, password);
      const existingEmployee = state.employees.find((employee) => normalizeEmployeeLoginId(employee.login_id) === loginId);
      const payload = {
        departmentId,
        position,
        name,
        role: "employee",
        loginId,
        loginEmail,
        authUserId,
      };
      if (existingEmployee) {
        await updateEmployee(state.client, existingEmployee.id, {
          ...payload,
          role: existingEmployee.role || "employee",
          isActive: true,
          mustChangePassword: true,
        });
      } else {
        await createEmployee(state.client, payload);
      }
    }
    clearEmployeeEditor();
    await refreshManageData();
    showToast("직원 정보가 저장되었습니다.");
  } catch (error) {
    showError(error);
  }
}

async function deleteEmployee(employeeId) {
  if (!confirm("이 직원을 삭제 처리할까요?")) return;
  try {
    await deactivateEmployee(state.client, employeeId);
    clearEmployeeEditor();
    await refreshManageData();
    showToast("직원이 삭제 처리되었습니다.");
  } catch (error) {
    showError(error);
  }
}

function clearEmployeeEditor() {
  state.selectedEmployeeId = null;
  ["#employeeDepartment", "#employeePosition", "#employeeLoginId", "#employeeName", "#employeePassword"].forEach((selector) => {
    document.querySelector(selector).value = "";
  });
}

async function uploadEmployeesXlsx(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const rows = await parseEmployeeXlsx(file);
    const seenLoginIds = new Set();
    const results = { created: 0, updated: 0, skipped: 0, failed: 0 };
    const messages = [];
    for (const row of rows) {
      try {
        if (seenLoginIds.has(row.loginId)) {
          results.skipped += 1;
          messages.push(`${row.line}행: 파일 안에서 중복된 ID라 건너뜀 (${row.loginId})`);
          continue;
        }
        seenLoginIds.add(row.loginId);

        const department = state.departments.find((item) => item.name === row.department);
        if (!department) throw new Error(`등록되지 않은 부서입니다. (${row.department})`);

        const existingEmployee = state.employees.find((employee) => normalizeEmployeeLoginId(employee.login_id) === row.loginId);
        if (existingEmployee?.is_active) {
          results.skipped += 1;
          messages.push(`${row.line}행: 이미 등록된 직원이라 건너뜀 (${row.loginId})`);
          continue;
        }

        const loginEmail = resolveAuthEmailFromEmployeeId(row.loginId);
        const authUserId = await ensureEmployeeAuthUser(loginEmail, row.password);
        const payload = {
          departmentId: department.id,
          position: row.position,
          name: row.name,
          role: row.role,
          loginId: row.loginId,
          loginEmail,
          authUserId,
        };

        if (existingEmployee) {
          await updateEmployee(state.client, existingEmployee.id, {
            ...payload,
            role: existingEmployee.role || "employee",
            isActive: true,
            mustChangePassword: true,
          });
          results.updated += 1;
        } else {
          await createEmployee(state.client, payload);
          results.created += 1;
        }
      } catch (error) {
        results.failed += 1;
        messages.push(`${row.line}행: ${error.message}`);
      }
    }
    state.employeePage = 1;
    await refreshManageData();
    showToast(`업로드 완료: 신규 ${results.created}건, 복구 ${results.updated}건, 중복 건너뜀 ${results.skipped}건, 실패 ${results.failed}건${messages.length ? ` / ${messages.slice(0, 3).join(" | ")}` : ""}`);
  } catch (error) {
    showError(error);
  } finally {
    event.target.value = "";
  }
}

async function parseEmployeeXlsx(file) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("직원 업로드 파일은 .xlsx 형식이어야 합니다.");
  }
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("엑셀 파일에 시트가 없습니다.");
  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
  const rows = matrix.map((cols, index) => ({ line: index + 1, cols: cols.map((col) => String(col).trim()) }));
  const hasHeader = rows[0]?.cols.some((cell) => [...EMPLOYEE_SHEET_HEADERS, "role", "is_active", "must_change_password"].includes(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows
    .filter((row) => row.cols.some(Boolean))
    .map((row) => {
      const [department, loginId, name, password, position, role] = row.cols;
      if (!department) throw new Error(`${row.line}행: 'department' 값이 필요합니다.`);
      if (!loginId) throw new Error(`${row.line}행: 'login_id' 값이 필요합니다.`);
      if (!name) throw new Error(`${row.line}행: 'name' 값이 필요합니다.`);
      if (!password || password.length < 6) throw new Error(`${row.line}행: password는 6자리 이상이어야 합니다.`);
      return {
        line: row.line,
        department,
        loginId: normalizeEmployeeLoginId(loginId),
        name,
        password,
        position: position || "사원",
        role: normalizeEmployeeRole(role),
      };
    });
}

async function parseTripXlsx(file) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("출장 업로드 파일은 .xlsx 형식이어야 합니다.");
  }
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("업로드 파일에 시트가 없습니다.");
  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
  const rows = matrix.map((cols, index) => ({ line: index + 1, cols }));
  const header = rows[0]?.cols.map(normalizeHeaderCell) || [];
  const hasHeader = header.some((cell) => TRIP_SHEET_HEADERS.includes(cell));
  const indexOf = (name, fallback) => {
    const names = Array.isArray(name) ? name : [name];
    const index = header.findIndex((cell) => names.includes(cell));
    return index >= 0 ? index : fallback;
  };
  const indexes = {
    name: indexOf("name", 0),
    position: indexOf("position", 1),
    department: indexOf("department", 2),
    country: indexOf("country", 3),
    companyName: indexOf(["compay name", "company name"], 4),
    startDate: indexOf("start date", 5),
    endDate: indexOf("end date", 6),
  };
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows
    .filter((row) => row.cols.some((cell) => String(cell ?? "").trim()))
    .map((row) => {
      const name = cellText(row.cols[indexes.name]);
      const position = cellText(row.cols[indexes.position]);
      const department = cellText(row.cols[indexes.department]);
      const country = cellText(row.cols[indexes.country]);
      const companyName = cellText(row.cols[indexes.companyName]);
      const missingFields = [
        ["name", name],
        ["position", position],
        ["department", department],
        ["Country", country],
        ["Compay Name", companyName],
        ["Start date", row.cols[indexes.startDate]],
        ["End Date", row.cols[indexes.endDate]],
      ]
        .filter(([, valueToCheck]) => cellText(valueToCheck) === "")
        .map(([label]) => label);
      if (missingFields.length) {
        return { line: row.line, skipReason: `필수 값 누락 (${missingFields.join(", ")})` };
      }

      let startDate = "";
      let endDate = "";
      try {
        startDate = normalizeTripDate(row.cols[indexes.startDate], row.line, "Start date");
        endDate = normalizeTripDate(row.cols[indexes.endDate], row.line, "End Date");
      } catch (error) {
        return { line: row.line, skipReason: error.message };
      }
      if (endDate < startDate) {
        return { line: row.line, skipReason: "End Date가 Start date보다 빠릅니다." };
      }
      return { line: row.line, name, position, department, country, companyName, startDate, endDate };
    });
}

async function downloadTripsXlsx() {
  const rows = [["name", "position", "department", "Country", "Compay Name", "Start date", "End Date", "note"]];
  filteredTrips().forEach((trip) => {
    const employee = state.employees.find((item) => item.id === trip.employee_id);
    const department = state.departments.find((item) => item.id === trip.department_id);
    rows.push([
      employee?.name || "",
      displayPosition(employee),
      department?.name || "",
      trip.country || "",
      trip.company_name || "",
      trip.start_date || "",
      trip.end_date || "",
      trip.note || "",
    ]);
  });
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "business_trips");
  XLSX.writeFile(workbook, "business_trips.xlsx");
}

function normalizeHeaderCell(valueToNormalize) {
  return String(valueToNormalize ?? "").trim().toLowerCase();
}

function cellText(valueToRead) {
  return String(valueToRead ?? "").trim();
}

function normalizeTripDate(valueToNormalize, line, label) {
  if (valueToNormalize instanceof Date && !Number.isNaN(valueToNormalize.getTime())) {
    return toDateInputValue(valueToNormalize);
  }
  if (typeof valueToNormalize === "number") {
    return excelSerialDateToInputValue(valueToNormalize);
  }
  const text = cellText(valueToNormalize);
  if (!text) throw new Error(`${line}행: ${label} 값이 필요합니다.`);
  if (/^\d+(\.\d+)?$/.test(text)) {
    return excelSerialDateToInputValue(Number(text));
  }
  const normalized = text.replaceAll(".", "-").replaceAll("/", "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) throw new Error(`${line}행: ${label} 날짜 형식이 올바르지 않습니다. (${text})`);
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function excelSerialDateToInputValue(serial) {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return toDateInputValue(date);
}

function toDateInputValue(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function downloadEmployeesXlsx() {
  const XLSX = await loadXlsx();
  const rows = [EMPLOYEE_SHEET_HEADERS];
  state.employees.forEach((employee) => {
    const department = state.departments.find((item) => item.id === employee.department_id);
    rows.push([
      department?.name || "",
      employee.login_id || "",
      employee.name || "",
      "",
      employee.position || "",
    ]);
  });
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, "employees");
  XLSX.writeFile(workbook, "employees.xlsx");
}

function setupCompanyActions() {
  document.querySelector("#companyAddButton").addEventListener("click", async () => {
    const name = value("#companyNameInput");
    if (!name) return showToast("업체명을 입력해주세요.");
    try {
      await createCompany(state.client, name);
      document.querySelector("#companyNameInput").value = "";
      await refreshManageData();
      showToast("업체가 추가되었습니다.");
    } catch (error) {
      showError(error);
    }
  });
}

function renderCompanyList() {
  const list = document.querySelector("#companyList");
  if (!state.companies.length) {
    list.innerHTML = `<div class="manage-item"><span>등록된 업체가 없습니다.</span></div>`;
    return;
  }
  list.innerHTML = state.companies
    .map(
      (company) => `<div class="manage-item">
        <span>${escapeHtml(company.name)} ${company.is_active ? "" : "(미사용)"}</span>
        <button class="primary-button" data-edit-company="${company.id}" type="button">수정</button>
        <button class="warning-button" data-delete-company="${company.id}" type="button">삭제</button>
      </div>`,
    )
    .join("");
  list.querySelectorAll("[data-edit-company]").forEach((button) => {
    button.addEventListener("click", () => editCompany(button.dataset.editCompany));
  });
  list.querySelectorAll("[data-delete-company]").forEach((button) => {
    button.addEventListener("click", () => deleteCompany(button.dataset.deleteCompany));
  });
}

async function editCompany(companyId) {
  const company = state.companies.find((item) => item.id === companyId);
  const nextName = prompt("업체명을 수정하세요.", company?.name || "");
  if (!nextName) return;
  try {
    await updateCompany(state.client, companyId, { name: nextName, isActive: true });
    await refreshManageData();
    showToast("업체가 수정되었습니다.");
  } catch (error) {
    showError(error);
  }
}

async function deleteCompany(companyId) {
  if (!confirm("이 업체를 삭제 처리할까요?")) return;
  try {
    await deactivateCompany(state.client, companyId);
    await refreshManageData();
    showToast("업체가 삭제 처리되었습니다.");
  } catch (error) {
    showError(error);
  }
}

async function refreshManageData() {
  await loadReferenceData();
  const activeCount = state.employees.filter((employee) => employee.is_active).length;
  const employeePages = Math.max(1, Math.ceil(activeCount / EMPLOYEE_PAGE_SIZE));
  state.employeePage = Math.min(state.employeePage, employeePages);
  renderDepartmentList();
  renderEmployeeEditorDepartments();
  renderEmployeeList();
  renderCompanyList();
}

function populateDepartmentSelect(selector) {
  const select = document.querySelector(selector);
  if (!select) return;
  select.innerHTML = `<option value="">부서 선택</option>${state.departments
    .filter((department) => department.is_active)
    .map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
    .join("")}`;
}

function populateSelect(selector, values, placeholder) {
  const select = document.querySelector(selector);
  if (!select) return;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${values
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("")}`;
}

function populateTripCountrySelect(selector, values, placeholder) {
  const select = document.querySelector(selector);
  if (!select) return;
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  const otherCountries = uniqueValues
    .filter((item) => item !== "국내")
    .sort((a, b) => a.localeCompare(b, "ko"));
  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    `<option value="국내">국내</option>`,
    `<option value="" disabled>────────</option>`,
    ...otherCountries.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`),
  ].join("");
}

function renderPagination(total, renderFn) {
  const nav = document.querySelector(".pagination");
  if (!nav) return;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const links = Array.from({ length: Math.min(pages, 5) }, (_, index) => index + 1)
    .map((page) => (page === state.page ? `<strong>${page}</strong>` : `<a href="#page-${page}" data-page="${page}">${page}</a>`))
    .join("");
  nav.innerHTML = `<a href="#first" data-page="1">[처음]</a><a href="#prev" data-page="${Math.max(1, state.page - 1)}">[이전]</a>${links}<a href="#next" data-page="${Math.min(pages, state.page + 1)}">[다음]</a><a href="#last" data-page="${pages}">[마지막]</a>`;
  nav.querySelectorAll("[data-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      state.page = Number(link.dataset.page);
      renderFn();
    });
  });
}

function paginate(rows, page) {
  return paginateBySize(rows, page, PAGE_SIZE);
}

function paginateBySize(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

function renderEmployeePagination(total) {
  const nav = document.querySelector(".employee-list-panel .pagination");
  if (!nav) return;
  const pages = Math.max(1, Math.ceil(total / EMPLOYEE_PAGE_SIZE));
  state.employeePage = Math.min(state.employeePage, pages);
  const pageLinks = Array.from({ length: pages }, (_, index) => index + 1)
    .map((page) => {
      if (page === state.employeePage) return `<strong>${page}</strong>`;
      return `<a href="#employee-page-${page}" data-employee-page="${page}">${page}</a>`;
    })
    .join("");
  nav.innerHTML = [
    pageControl("[처음]", state.employeePage > 1 ? 1 : null, "employee"),
    pageControl("[이전]", state.employeePage > 1 ? state.employeePage - 1 : null, "employee"),
    pageLinks,
    pageControl("[다음]", state.employeePage < pages ? state.employeePage + 1 : null, "employee"),
    pageControl("[마지막]", state.employeePage < pages ? pages : null, "employee"),
  ].join("");
  nav.querySelectorAll("[data-employee-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      state.employeePage = Number(link.dataset.employeePage);
      renderEmployeeList();
    });
  });
}

function pageControl(label, page, kind) {
  if (!page) return `<span class="page-disabled">${label}</span>`;
  const attr = kind === "employee" ? "data-employee-page" : "data-page";
  return `<a href="#page-${page}" ${attr}="${page}">${label}</a>`;
}

function formatTripPeriod(trip) {
  if (!trip.start_date || !trip.end_date) return "-";
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  const days = Math.round((end - start) / 86400000) + 1;
  return `${days}일간 (${trip.start_date} ~ ${trip.end_date})`;
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayPosition(employee) {
  return employee?.position || EMPTY_POSITION_LABEL;
}

async function loadXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  }
  return xlsxModulePromise;
}

function normalizeEmployeeRole(value) {
  const role = String(value || "employee").trim();
  if (["employee", "department_manager", "admin"].includes(role)) return role;
  const roleMap = {
    일반직원: "employee",
    직원: "employee",
    일반: "employee",
    부서장: "department_manager",
    관리자: "admin",
  };
  return roleMap[role] || "employee";
}

function setupToasts() {
  if (document.querySelector("#toast")) return;
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = "toast";
  toast.innerHTML = `<span data-toast-message></span><button class="toast-copy" type="button">복사</button>`;
  document.body.appendChild(toast);
  toast.querySelector("button").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(toast.querySelector("[data-toast-message]").textContent || "");
  });
}

function showError(error) {
  console.error(error);
  showToast(error?.message || "알 수 없는 오류가 발생했습니다.");
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  const messageTarget = toast.querySelector("[data-toast-message]");
  messageTarget.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 10000);
}

function value(selector) {
  return document.querySelector(selector)?.value.trim() || "";
}

function escapeHtml(valueToEscape) {
  return String(valueToEscape ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
