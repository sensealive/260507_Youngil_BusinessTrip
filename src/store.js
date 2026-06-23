const ACTIVE = true;

function throwIfError(error) {
  if (error) throw error;
}

function isMissingPositionColumn(error) {
  const message = String(error?.message || "");
  return (
    message.includes("employees.position") ||
    (message.includes("'position' column") && message.includes("'employees'")) ||
    (message.includes("position") && message.includes("employees") && message.includes("schema cache"))
  );
}

function isMissingCompaniesTable(error) {
  const message = String(error?.message || "");
  return message.includes("companies") && (message.includes("does not exist") || message.includes("schema cache"));
}

function withoutPosition(payload) {
  const { position, ...rest } = payload;
  return rest;
}

export async function fetchDepartments(client, { includeInactive = false } = {}) {
  let query = client.from("departments").select("id,name,is_active,created_at,updated_at").order("name");
  if (!includeInactive) query = query.eq("is_active", ACTIVE);
  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

export async function createDepartment(client, name) {
  const { data, error } = await client
    .from("departments")
    .insert({ name: name.trim() })
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function updateDepartment(client, departmentId, payload) {
  const { data, error } = await client
    .from("departments")
    .update({
      name: payload.name.trim(),
      is_active: payload.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", departmentId)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function deactivateDepartment(client, departmentId) {
  const { data, error } = await client
    .from("departments")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", departmentId)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function upsertDepartments(client, rows) {
  const payload = rows.map((row) => ({
    name: row.name.trim(),
    is_active: row.is_active,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await client
    .from("departments")
    .upsert(payload, { onConflict: "name" })
    .select();
  throwIfError(error);
  return data || [];
}

export async function fetchEmployees(client, { departmentId = null, includeInactive = false } = {}) {
  const baseSelect = "id,department_id,name,role,login_id,login_email,auth_user_id,is_active,must_change_password,created_at,updated_at";
  let query = buildEmployeeQuery(client, `${baseSelect},position`, { departmentId, includeInactive });
  let { data, error } = await query;
  if (isMissingPositionColumn(error)) {
    ({ data, error } = await buildEmployeeQuery(client, baseSelect, { departmentId, includeInactive }));
  }
  throwIfError(error);
  return data || [];
}

function buildEmployeeQuery(client, select, { departmentId, includeInactive }) {
  let query = client.from("employees").select(select).order("name");
  if (departmentId) query = query.eq("department_id", departmentId);
  if (!includeInactive) query = query.eq("is_active", ACTIVE);
  return query;
}

export async function createEmployee(client, payload) {
  const row = {
    department_id: payload.departmentId,
    name: payload.name.trim(),
    position: payload.position?.trim() || null,
    role: payload.role,
    login_id: payload.loginId.trim().toLowerCase(),
    login_email: payload.loginEmail?.trim() || null,
    auth_user_id: payload.authUserId?.trim() || null,
    must_change_password: true,
  };
  let { data, error } = await client
    .from("employees")
    .insert(row)
    .select()
    .single();
  if (isMissingPositionColumn(error)) {
    ({ data, error } = await client.from("employees").insert(withoutPosition(row)).select().single());
  }
  throwIfError(error);
  return data;
}

export async function updateEmployee(client, employeeId, payload) {
  const row = {
    department_id: payload.departmentId,
    name: payload.name.trim(),
    position: payload.position?.trim() || null,
    role: payload.role,
    login_id: payload.loginId.trim().toLowerCase(),
    login_email: payload.loginEmail?.trim() || null,
    auth_user_id: payload.authUserId?.trim() || null,
    is_active: payload.isActive,
    must_change_password: payload.mustChangePassword,
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await client
    .from("employees")
    .update(row)
    .eq("id", employeeId)
    .select()
    .single();
  if (isMissingPositionColumn(error)) {
    ({ data, error } = await client.from("employees").update(withoutPosition(row)).eq("id", employeeId).select().single());
  }
  throwIfError(error);
  return data;
}

export async function deactivateEmployee(client, employeeId) {
  const { data, error } = await client
    .from("employees")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", employeeId)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function hasEmployeeTrips(client, employeeId) {
  const { data, error } = await client
    .from("trips")
    .select("id")
    .eq("employee_id", employeeId)
    .limit(1);
  throwIfError(error);
  return Boolean(data?.length);
}

export async function hardDeleteEmployee(client, employeeId) {
  const { data, error } = await client
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function upsertEmployees(client, rows) {
  const payload = rows.map((row) => ({
    department_id: row.department_id,
    name: row.name.trim(),
    position: row.position?.trim() || null,
    role: row.role,
    login_id: row.login_id.trim().toLowerCase(),
    login_email: row.login_email?.trim() || null,
    auth_user_id: row.auth_user_id?.trim() || null,
    is_active: row.is_active,
    must_change_password: row.must_change_password,
    updated_at: new Date().toISOString(),
  }));
  let { data, error } = await client
    .from("employees")
    .upsert(payload, { onConflict: "login_id" })
    .select();
  if (isMissingPositionColumn(error)) {
    ({ data, error } = await client
      .from("employees")
      .upsert(payload.map(withoutPosition), { onConflict: "login_id" })
      .select());
  }
  throwIfError(error);
  return data || [];
}

export async function fetchCurrentProfile(client, authUserId) {
  let { data, error } = await client
    .from("employees")
    .select("id,department_id,name,position,role,login_id,login_email,auth_user_id,is_active,must_change_password,departments(name)")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();
  if (isMissingPositionColumn(error)) {
    ({ data, error } = await client
      .from("employees")
      .select("id,department_id,name,role,login_id,login_email,auth_user_id,is_active,must_change_password,departments(name)")
      .eq("auth_user_id", authUserId)
      .eq("is_active", true)
      .maybeSingle());
  }
  throwIfError(error);
  return data;
}

export async function fetchCountries(client) {
  const { data, error } = await client
    .from("countries")
    .select("id,name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.warn("국가 목록 조회 실패, 기본값을 사용합니다.", error);
    return fallbackCountries();
  }

  return data?.length ? data : fallbackCountries();
}

export async function fetchCompanies(client, { includeInactive = false } = {}) {
  let query = client.from("companies").select("id,name,is_active,created_at,updated_at").order("name");
  if (!includeInactive) query = query.eq("is_active", ACTIVE);
  const { data, error } = await query;
  if (isMissingCompaniesTable(error)) {
    console.warn("업체 테이블이 아직 없어 빈 목록을 사용합니다. 004 마이그레이션을 실행해주세요.", error);
    return [];
  }
  throwIfError(error);
  return data || [];
}

export async function createCompany(client, name) {
  const { data, error } = await client
    .from("companies")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (isMissingCompaniesTable(error)) {
    throw new Error("업체등록 테이블(companies)이 아직 없습니다. Supabase SQL Editor에서 004_position_and_companies.sql을 먼저 실행해주세요.");
  }
  throwIfError(error);
  return data;
}

export async function updateCompany(client, companyId, payload) {
  const { data, error } = await client
    .from("companies")
    .update({
      name: payload.name.trim(),
      is_active: payload.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .select()
    .single();
  if (isMissingCompaniesTable(error)) {
    throw new Error("업체등록 테이블(companies)이 아직 없습니다. Supabase SQL Editor에서 004_position_and_companies.sql을 먼저 실행해주세요.");
  }
  throwIfError(error);
  return data;
}

export async function deactivateCompany(client, companyId) {
  const { data, error } = await client
    .from("companies")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", companyId)
    .select()
    .single();
  if (isMissingCompaniesTable(error)) {
    throw new Error("업체등록 테이블(companies)이 아직 없습니다. Supabase SQL Editor에서 004_position_and_companies.sql을 먼저 실행해주세요.");
  }
  throwIfError(error);
  return data;
}

export async function fetchTrips(client, profile) {
  const { data, error } = await client
    .from("trips")
    .select("id,employee_id,department_id,start_date,end_date,country,company_name,city,note,status,created_at,updated_at")
    .neq("status", "deleted")
    .order("start_date", { ascending: false });
  throwIfError(error);
  return data || [];
}

export async function createTrip(client, profile, payload) {
  return createTripForEmployee(client, { employeeId: profile.id, departmentId: profile.department_id }, payload);
}

export async function createTripForEmployee(client, target, payload) {
  const { data, error } = await client
    .from("trips")
    .insert({
      employee_id: target.employeeId,
      department_id: target.departmentId,
      start_date: payload.startDate,
      end_date: payload.endDate,
      country: payload.country,
      company_name: payload.companyName.trim(),
      city: payload.city.trim() || null,
      note: payload.note.trim() || null,
      status: "active",
    })
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function updateTrip(client, tripId, payload) {
  const row = {
    start_date: payload.startDate,
    end_date: payload.endDate,
    country: payload.country,
    company_name: payload.companyName.trim(),
    city: payload.city.trim() || null,
    note: payload.note.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (payload.employeeId) row.employee_id = payload.employeeId;
  if (payload.departmentId) row.department_id = payload.departmentId;

  const { data, error } = await client
    .from("trips")
    .update(row)
    .eq("id", tripId)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function cancelTrip(client, tripId) {
  const { data, error } = await client
    .from("trips")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", tripId)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function markPasswordChanged(client) {
  const { error } = await client.rpc("mark_own_password_changed");
  throwIfError(error);
}

export function fallbackCountries() {
  return [
    "국내",
    "미국",
    "중국",
    "캐나다",
    "멕시코",
    "브라질",
    "인도",
    "인도네시아",
    "포르투갈",
    "폴란드",
    "슬로바키아",
    "일본",
    "프랑스",
    "이탈리아",
    "사우디아라비아",
    "영국",
    "독일",
    "러시아",
    "베트남",
    "기타",
  ].map((name, index) => ({
    id: `fallback-${index}`,
    name,
    sort_order: index + 1,
    is_active: true,
  }));
}
