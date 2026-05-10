/** 배포 시 여기에 프로젝트 URL·anon key를 넣으면 직원은 별도 설정 없이 로그인할 수 있습니다. 비어 있으면 관리자가 «관리자 로그인»에서 한 번 저장합니다. */
export const DEFAULT_SUPABASE_URL = "";
export const DEFAULT_SUPABASE_ANON_KEY = "";

/** Supabase Auth에 등록하는 이메일과 동일해야 합니다. 화면에서는 아이디만 `admin`으로 입력합니다. */
export const DEFAULT_ADMIN_AUTH_EMAIL = "admin@project.local";
export const AUTH_EMAIL_DOMAIN = "project.local";

const STORAGE_KEYS = {
  url: "youngil.supabase.url",
  anonKey: "youngil.supabase.anonKey",
};

let localConfigPromise = null;

async function loadLocalConfig() {
  if (!localConfigPromise) {
    localConfigPromise = import("./config.local.js").catch(() => ({}));
  }
  return localConfigPromise;
}

export async function loadRuntimeConfig() {
  const localConfig = await loadLocalConfig();
  return {
    url: localStorage.getItem(STORAGE_KEYS.url) || localConfig.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: localStorage.getItem(STORAGE_KEYS.anonKey) || localConfig.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function saveRuntimeConfig({ url, anonKey }) {
  localStorage.setItem(STORAGE_KEYS.url, url.trim());
  localStorage.setItem(STORAGE_KEYS.anonKey, anonKey.trim());
}

export function clearRuntimeConfig() {
  localStorage.removeItem(STORAGE_KEYS.url);
  localStorage.removeItem(STORAGE_KEYS.anonKey);
}

/** localStorage 또는 위 기본값 중 URL·anon key가 모두 있으면 true */
export function hasEffectiveSupabaseConfig(config) {
  return Boolean(String(config.url || "").trim() && String(config.anonKey || "").trim());
}

/** 관리자 로그인: `admin` → `admin@project.local`, 이미 @가 있으면 그대로 */
export function resolveAuthEmailFromAdminId(input) {
  const t = String(input || "").trim();
  if (!t) return "";
  if (t.includes("@")) return t;
  return `${t}@${AUTH_EMAIL_DOMAIN}`;
}

export function normalizeEmployeeLoginId(input) {
  return String(input || "").trim().toLowerCase();
}

export function resolveAuthEmailFromEmployeeId(input) {
  const id = normalizeEmployeeLoginId(input);
  if (!id) return "";
  if (id.includes("@")) return id;
  return `${id}@${AUTH_EMAIL_DOMAIN}`;
}
