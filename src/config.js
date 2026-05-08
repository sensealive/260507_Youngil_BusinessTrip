export const DEFAULT_SUPABASE_URL = "";
export const DEFAULT_SUPABASE_ANON_KEY = "";

const STORAGE_KEYS = {
  url: "youngil.supabase.url",
  anonKey: "youngil.supabase.anonKey",
};

export function loadRuntimeConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.url) || DEFAULT_SUPABASE_URL,
    anonKey: localStorage.getItem(STORAGE_KEYS.anonKey) || DEFAULT_SUPABASE_ANON_KEY,
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

export function hasRuntimeConfig(config = loadRuntimeConfig()) {
  return Boolean(config.url && config.anonKey);
}
