import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Auth 계정 처리 중 오류가 발생했습니다.";
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function validatePassword(value: unknown) {
  const password = String(value || "");
  if (password.length < 6) {
    throw new Error("비밀번호는 6자리 이상이어야 합니다.");
  }
  return password;
}

async function findUserIdByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < perPage) return "";
    page += 1;
  }

  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 지원합니다." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Edge Function 환경변수 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return jsonResponse({ error: "로그인 세션이 필요합니다." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !userData.user?.id) {
      return jsonResponse({ error: "로그인 세션을 확인할 수 없습니다." }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("employees")
      .select("id,role,is_active")
      .eq("auth_user_id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "admin") {
      return jsonResponse({ error: "관리자만 Auth 계정을 생성/수정할 수 있습니다." }, 403);
    }

    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password);
    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "유효한 이메일 형식이 필요합니다." }, 400);
    }

    const existingUserId = await findUserIdByEmail(adminClient, email);
    if (existingUserId) {
      const { data, error } = await adminClient.auth.admin.updateUserById(existingUserId, {
        password,
      });
      if (error) throw error;
      return jsonResponse({ userId: data.user.id, mode: "updated" });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    return jsonResponse({ userId: data.user.id, mode: "created" }, 201);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
});
