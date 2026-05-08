import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { hasRuntimeConfig, loadRuntimeConfig } from "./config.js";

let cachedClient = null;
let cachedSignature = "";

export function getSupabaseClient() {
  const config = loadRuntimeConfig();
  if (!hasRuntimeConfig(config)) {
    throw new Error("Supabase URL과 anon key를 먼저 설정하세요.");
  }

  const signature = `${config.url}:${config.anonKey.slice(0, 12)}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    cachedSignature = signature;
  }

  return cachedClient;
}
