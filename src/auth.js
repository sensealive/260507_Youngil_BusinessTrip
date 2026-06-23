import { resolveAuthEmailFromAdminId } from "./config.js";
import { createEphemeralSupabaseClient } from "./supabase.js";
import { fetchCurrentProfile } from "./store.js";

function isInvalidCredentials(error) {
  return error?.message === "Invalid login credentials";
}

function isAlreadyRegistered(error) {
  return String(error?.message || "").includes("User already registered");
}

export async function signInAsAdmin(client, adminId, password) {
  const email = resolveAuthEmailFromAdminId(adminId);
  if (!email) throw new Error("관리자 아이디를 입력하세요.");
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (isInvalidCredentials(error)) {
    throw new Error(
      `관리자 Auth 계정(${email}) 또는 비밀번호가 맞지 않습니다. Supabase Authentication에 해당 사용자를 만들고 Auto Confirm을 켠 뒤, 콘솔에 설정한 비밀번호로 로그인하세요.`
    );
  }
  if (error) throw error;
  return data;
}

export async function signInSelectedEmployee(client, employee, password) {
  if (!employee?.login_email) {
    throw new Error("선택한 직원의 로그인 ID 연결 정보가 없습니다.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: employee.login_email,
    password,
  });
  if (isInvalidCredentials(error)) {
    throw new Error(
      `직원 Auth 계정(${employee.login_email}) 또는 비밀번호가 맞지 않습니다. 직원 정보 행만 있고 Supabase Authentication 사용자가 없으면 로그인할 수 없으니, 관리자 페이지에서 직원을 다시 등록하거나 Authentication 사용자를 확인해주세요.`
    );
  }
  if (error) throw error;
  return data;
}

export async function createEmployeeAuthUser(email, password) {
  const client = await createEphemeralSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  if (!data.user?.id) {
    throw new Error("Auth 사용자를 만들었지만 사용자 ID를 가져오지 못했습니다.");
  }
  await client.auth.signOut();
  return data.user.id;
}

async function describeFunctionError(error) {
  try {
    const body = await error.context?.json();
    return body?.error || body?.message || error.message;
  } catch {
    return error?.message || "알 수 없는 오류";
  }
}

async function ensureEmployeeAuthUserWithAdminFunction(client, email, password) {
  const { data, error } = await client.functions.invoke("admin-upsert-employee-auth", {
    body: { email, password },
  });
  if (error) {
    const message = await describeFunctionError(error);
    throw new Error(`Auth 계정 자동 생성/비밀번호 설정에 실패했습니다. (${message})`);
  }
  if (!data?.userId) {
    throw new Error(`Auth 계정(${email})의 사용자 ID를 가져오지 못했습니다.`);
  }
  return data.userId;
}

async function ensureEmployeeAuthUserWithPublicSignup(email, password) {
  try {
    return await createEmployeeAuthUser(email, password);
  } catch (error) {
    if (!isAlreadyRegistered(error)) throw error;
  }

  const client = await createEphemeralSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (isInvalidCredentials(error)) {
    throw new Error(
      `Auth 계정(${email})은 이미 존재하지만 입력한 비밀번호가 맞지 않습니다. Supabase Authentication에서 해당 사용자 비밀번호를 변경하거나, 같은 비밀번호로 다시 저장해주세요.`
    );
  }
  if (error) throw error;
  const userId = data.user?.id;
  await client.auth.signOut();
  if (!userId) throw new Error(`Auth 계정(${email})의 사용자 ID를 가져오지 못했습니다.`);
  return userId;
}

export async function ensureEmployeeAuthUser(client, email, password) {
  if (client?.functions?.invoke) {
    return ensureEmployeeAuthUserWithAdminFunction(client, email, password);
  }
  return ensureEmployeeAuthUserWithPublicSignup(email, password);
}

export async function loadSignedInProfile(client) {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) return null;
  return fetchCurrentProfile(client, user.id);
}

export async function signOut(client) {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function changePassword(client, newPassword) {
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
