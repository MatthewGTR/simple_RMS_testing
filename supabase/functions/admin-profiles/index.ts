import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) })
  }
  const headers = corsHeaders(req)

  try {
    const authHeader = req.headers.get("Authorization") || ""
    const jwt = authHeader.replace("Bearer ", "")
    if (!jwt) return Response.json({ error: "Missing token" }, { status: 401, headers })

    const svc = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: { user }, error: uerr } = await svc.auth.getUser(jwt)
    if (uerr || !user) return Response.json({ error: "Invalid token" }, { status: 401, headers })

    const { data: isAdminData, error: aerr } = await svc.rpc("is_admin", { p_uid: user.id })
    if (aerr || !isAdminData) return Response.json({ error: "Forbidden" }, { status: 403, headers })

    if (req.method === "GET") {
      const { data, error } = await svc.rpc("admin_list_profiles")
      if (error) throw error
      return Response.json(data, { headers })
    }

    if (req.method === "POST") {
      const body = await req.json()
      const { p_user_id, p_delta, p_reason } = body
      const { error } = await svc.rpc("admin_update_credits", { p_user_id, p_delta, p_reason })
      if (error) throw error
      return Response.json({ ok: true }, { headers })
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers })
  }
})

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  }
}
