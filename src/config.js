/** Supabase 프로젝트 URL과 anon/public key는 브라우저에 공개되는 클라이언트 설정입니다. */
export const DEFAULT_SUPABASE_URL = "";
export const DEFAULT_SUPABASE_ANON_KEY = "";

/** Supabase Auth에 등록하는 이메일과 동일해야 합니다. 화면에서는 아이디만 `admin`으로 입력합니다. */
export const DEFAULT_ADMIN_AUTH_EMAIL = "admin@project.local";
export const AUTH_EMAIL_DOMAIN = "project.local";

export async function loadRuntimeConfig() {
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  };
}

/** 기본값 중 URL·anon key가 모두 있으면 true */
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
