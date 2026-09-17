import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function readSecretKey() {
  const namedKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys) as Record<string, unknown>;
      const candidate = parsed.default ?? Object.values(parsed)[0];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    } catch {
      // Fallback abaixo mantém compatibilidade enquanto a migração de chaves ocorre.
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = readSecretKey();
  if (!url || !secretKey) return json({ ok: false, message: "Server configuration unavailable" }, 500);

  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("organization_settings")
    .select("phone")
    .eq("id", 1)
    .maybeSingle();

  if (error) return json({ ok: false, message: "Organization contact unavailable" }, 500);

  const phone = typeof data?.phone === "string" && data.phone.trim()
    ? data.phone.trim()
    : null;

  return json({ ok: true, phone });
});
