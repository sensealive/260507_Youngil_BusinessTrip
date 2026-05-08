const ACTIVE = true;

function throwIfError(error) {
  if (error) throw error;
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

export async function fetchEmployees(client, { departmentId = null, includeInactive = false } = {}) {
  let query = client
    .from("employees")
    .select("id,department_id,name,role,login_email,auth_user_id,is_active,must_change_password,created_at,updated_at")
    .order("name");
  if (departmentId) query = query.eq("department_id", departmentId);
  if (!includeInactive) query = query.eq("is_active", ACTIVE);
  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

export async function createEmployee(client, payload) {
  const { data, error } = await client
    .from("employees")
    .insert({
      department_id: payload.departmentId,
      name: payload.name.trim(),
      role: payload.role,
      login_email: payload.loginEmail.trim(),
      auth_user_id: payload.authUserId.trim(),
      must_change_password: true,
    })
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function fetchCurrentProfile(client, authUserId) {
  const { data, error } = await client
    .from("employees")
    .select("id,department_id,name,role,login_email,auth_user_id,is_active,must_change_password,departments(name)")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();
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

export async function fetchTrips(client, profile) {
  let query = client
    .from("trips")
    .select("id,employee_id,department_id,start_date,end_date,country,company_name,city,note,status,created_at,updated_at")
    .neq("status", "deleted")
    .order("start_date", { ascending: false });

  if (profile.role === "department_manager") {
    query = query.eq("department_id", profile.department_id);
  } else if (profile.role !== "admin") {
    query = query.or(`employee_id.eq.${profile.id},department_id.eq.${profile.department_id}`);
  }

  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

export async function createTrip(client, profile, payload) {
  const { data, error } = await client
    .from("trips")
    .insert({
      employee_id: profile.id,
      department_id: profile.department_id,
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
  const { data, error } = await client
    .from("trips")
    .update({
      start_date: payload.startDate,
      end_date: payload.endDate,
      country: payload.country,
      company_name: payload.companyName.trim(),
      city: payload.city.trim() || null,
      note: payload.note.trim() || null,
      updated_at: new Date().toISOString(),
    })
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

export async function markPasswordChanged(client, employeeId) {
  const { error } = await client
    .from("employees")
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", employeeId);
  throwIfError(error);
}

export function fallbackCountries() {
  return ["일본", "중국", "베트남", "미국", "인도", "독일", "멕시코", "기타"].map((name, index) => ({
    id: `fallback-${index}`,
    name,
    sort_order: index + 1,
    is_active: true,
  }));
}
