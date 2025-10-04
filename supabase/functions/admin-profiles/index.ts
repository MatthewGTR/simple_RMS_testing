import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return Response.json({ error: "Missing token" }, { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const svc = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: uerr } = await svc.auth.getUser(jwt);
    if (uerr || !user) {
      return Response.json({ error: "Invalid token" }, { status: 401, headers: corsHeaders });
    }

    const { data: isAdminData, error: aerr } = await svc.rpc("is_admin", { p_uid: user.id });
    if (aerr || !isAdminData) {
      return Response.json({ error: "Forbidden - Admin access required" }, { status: 403, headers: corsHeaders });
    }

    const { data: isSuperAdminData } = await svc.rpc("is_super_admin", { p_uid: user.id });
    const isSuperAdmin = !!isSuperAdminData;

    if (req.method === "GET") {
      const { data, error } = await svc.rpc("admin_list_profiles");
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action;

      if (action === "list-pending") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }
        const { data, error } = await svc.rpc("list_pending_credits");
        if (error) throw error;
        return Response.json(data, { headers: corsHeaders });
      }

      if (action === "apply-credits") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }
        const { p_user_id, p_delta, p_reason } = body;
        console.log('Super admin applying credits:', { p_user_id, p_delta, p_reason });
        const { data, error } = await userClient.rpc("admin_update_credits", { p_user_id, p_delta, p_reason });
        if (error) {
          console.error('Error calling admin_update_credits:', error);
          throw error;
        }
        return Response.json({ ok: true, data }, { headers: corsHeaders });
      }

      if (action === "request-credits") {
        const { p_user_id, p_delta, p_reason } = body;
        console.log('Admin requesting credits:', { p_user_id, p_delta, p_reason });
        const { data, error } = await svc.rpc("request_credit_change", { p_user_id, p_delta, p_reason });
        if (error) throw error;
        return Response.json({ ok: true, request_id: data }, { headers: corsHeaders });
      }

      if (action === "approve") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }
        const { p_request_id, p_review_notes } = body;
        const { error } = await svc.rpc("approve_credit_change", { p_request_id, p_review_notes });
        if (error) throw error;
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      if (action === "reject") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }
        const { p_request_id, p_review_notes } = body;
        const { error } = await svc.rpc("reject_credit_change", { p_request_id, p_review_notes });
        if (error) throw error;
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      if (action === "promote") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }
        const { p_user_id, p_new_role } = body;
        console.log('Super admin promoting user:', { p_user_id, p_new_role });
        const { data, error } = await userClient.rpc("admin_update_role", { p_user_id, p_new_role });
        if (error) {
          console.error('Error calling admin_update_role:', error);
          throw error;
        }
        return Response.json({ ok: true, data }, { headers: corsHeaders });
      }

      return Response.json({ error: "Invalid action" }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  } catch (e: any) {
    console.error('Edge function error:', e);
    const errorMessage = e?.message || e?.details || e?.hint || JSON.stringify(e);
    return Response.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
});