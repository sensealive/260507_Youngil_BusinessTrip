import { hasEffectiveSupabaseConfig, loadRuntimeConfig } from "./config.js";

let cachedClient = null;
let cachedSignature = "";
let supabaseModulePromise = null;

async function loadSupabaseModule() {
  if (!supabaseModulePromise) {
    supabaseModulePromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  }
  return supabaseModulePromise;
}

async function createConfiguredClient({ persistSession }) {
  const config = loadRuntimeConfig();
  if (!hasEffectiveSupabaseConfig(config)) {
    throw new Error("Supabase URL과 anon key가 필요합니다.");
  }
  const { createClient } = await loadSupabaseModule();
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession,
      autoRefreshToken: persistSession,
      detectSessionInUrl: false,
    },
  });
}

export async function getSupabaseClient() {
  const config = loadRuntimeConfig();
  if (!hasEffectiveSupabaseConfig(config)) {
    throw new Error("Supabase URL과 anon key가 필요합니다.");
  }

  const signature = `${config.url}:${config.anonKey.slice(0, 12)}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = await createConfiguredClient({ persistSession: true });
    cachedSignature = signature;
  }

  return cachedClient;
}

export function createEphemeralSupabaseClient() {
  return createConfiguredClient({ persistSession: false });
}
