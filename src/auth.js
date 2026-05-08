import { fetchCurrentProfile } from "./store.js";

export async function signInSelectedEmployee(client, employee, password) {
  if (!employee?.login_email) {
    throw new Error("선택한 직원의 로그인 문자열이 없습니다.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: employee.login_email,
    password,
  });
  if (error) throw error;
  return data;
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
