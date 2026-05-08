import { canEditTrip } from "./permissions.js";
import { inclusiveDays, isTripCurrent } from "./stats.js";

export function normalizeTripForm(form) {
  const payload = {
    startDate: form.startDate.value,
    endDate: form.endDate.value,
    country: form.country.value,
    companyName: form.companyName.value,
    city: form.city.value,
    note: form.note.value,
  };

  if (!payload.startDate || !payload.endDate || !payload.country || !payload.companyName.trim()) {
    throw new Error("필수 항목을 모두 입력하세요.");
  }

  if (payload.endDate < payload.startDate) {
    throw new Error("출장 종료일은 시작일보다 빠를 수 없습니다.");
  }

  return payload;
}

export function fillTripForm(form, trip) {
  form.tripId.value = trip.id;
  form.startDate.value = trip.start_date;
  form.endDate.value = trip.end_date;
  form.country.value = trip.country;
  form.companyName.value = trip.company_name;
  form.city.value = trip.city || "";
  form.note.value = trip.note || "";
}

export function clearTripForm(form) {
  form.tripId.value = "";
  form.startDate.value = "";
  form.endDate.value = "";
  form.country.value = "";
  form.companyName.value = "";
  form.city.value = "";
  form.note.value = "";
}

export function renderTripCards({ trips, profile, employeesById, departmentsById, onEdit, onCancel }) {
  if (!trips.length) return emptyState("표시할 출장 정보가 없습니다.");

  return trips.map((trip) => {
    const employee = employeesById.get(trip.employee_id);
    const department = departmentsById.get(trip.department_id);
    const current = isTripCurrent(trip);
    const editable = canEditTrip(profile, trip);
    const days = inclusiveDays(trip.start_date, trip.end_date);
    const statusLabel = trip.status === "cancelled" ? "취소" : current ? "출장 중" : "예정/완료";

    return `
      <article class="trip-card ${trip.status === "cancelled" ? "muted" : ""}">
        <div class="trip-card-main">
          <div>
            <span class="badge ${current ? "badge-live" : "badge-muted"}">${statusLabel}</span>
            <h3>${escapeHtml(employee?.name || "미지정 직원")} · ${escapeHtml(trip.country)}</h3>
            <p>${escapeHtml(department?.name || "미지정 부서")} / ${escapeHtml(trip.company_name)}</p>
            <p class="meta">${trip.start_date} ~ ${trip.end_date} · ${days}일${trip.city ? ` · ${escapeHtml(trip.city)}` : ""}</p>
            ${trip.note ? `<p class="note">${escapeHtml(trip.note)}</p>` : ""}
          </div>
          <div class="card-actions">
            ${editable ? `<button class="button secondary small" type="button" data-action="edit" data-id="${trip.id}">수정</button>` : ""}
            ${editable ? `<button class="button danger small" type="button" data-action="cancel" data-id="${trip.id}">취소</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

export function bindTripCardActions(container, { onEdit, onCancel }) {
  container.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => onEdit(button.dataset.id));
  });
  container.querySelectorAll("[data-action='cancel']").forEach((button) => {
    button.addEventListener("click", () => onCancel(button.dataset.id));
  });
}

export function renderCurrentTripCards({ trips, employeesById, departmentsById }) {
  const currentTrips = trips.filter((trip) => isTripCurrent(trip));
  if (!currentTrips.length) return emptyState("오늘 기준 출장 중인 직원이 없습니다.");
  return renderTripCards({
    trips: currentTrips,
    profile: null,
    employeesById,
    departmentsById,
    onEdit: () => {},
    onCancel: () => {},
  });
}

export function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
