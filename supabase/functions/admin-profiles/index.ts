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

      if (action === "get-transactions") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }

        const { data: transactions, error } = await svc
          .from('transaction_history')
          .select(`
            id,
            user_id,
            action_type,
            details,
            created_at,
            performed_by,
            user:profiles!transaction_history_user_id_fkey(email),
            performer:profiles!transaction_history_performed_by_fkey(email)
          `)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;

        const formatted = (transactions || []).map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          action_type: t.action_type,
          details: t.details,
          created_at: t.created_at,
          user_email: t.user?.email || 'Unknown',
          performer_email: t.performer?.email || 'System'
        }));

        return Response.json(formatted, { headers: corsHeaders });
      }

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

        // Send email notification
        try {
          const { data: targetUser } = await svc.from('profiles').select('email').eq('id', p_user_id).single();
          const { data: adminUser } = await svc.from('profiles').select('email').eq('id', user.id).single();

          if (targetUser?.email) {
            const oldCredits = (data as any)?.old_credits || 0;
            const newCredits = (data as any)?.new_credits || 0;

            await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: targetUser.email,
                subject: p_delta > 0 ? 'Credits Added to Your Account' : 'Credits Deducted from Your Account',
                html: `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: ${p_delta > 0 ? '#2563eb' : '#dc2626'};">${p_delta > 0 ? 'Credits Added' : 'Credits Deducted'}</h2>
                    <p>Hello,</p>
                    <p>Your account has been ${p_delta > 0 ? 'credited with' : 'debited'} <strong>${Math.abs(p_delta)} credits</strong>.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Previous Balance:</strong> ${oldCredits} credits</p>
                      <p style="margin: 5px 0;"><strong>New Balance:</strong> ${newCredits} credits</p>
                    </div>
                    <p style="font-size: 0.9em; color: #666;">Action performed by: ${adminUser?.email || 'Admin'}</p>
                    <p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>
                  </div></body></html>`
              })
            });
          }
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
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

        // Send email notification
        try {
          const { data: targetUser } = await svc.from('profiles').select('email').eq('id', p_user_id).single();
          const { data: adminUser } = await svc.from('profiles').select('email').eq('id', user.id).single();

          if (targetUser?.email) {
            const oldRole = (data as any)?.old_role || 'user';
            const newRole = (data as any)?.new_role || p_new_role;

            await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: targetUser.email,
                subject: 'Your Role Has Been Updated',
                html: `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Role Updated</h2>
                    <p>Hello,</p>
                    <p>Your role in Property AI has been updated.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Previous Role:</strong> ${oldRole}</p>
                      <p style="margin: 5px 0;"><strong>New Role:</strong> ${newRole}</p>
                    </div>
                    <p style="font-size: 0.9em; color: #666;">Action performed by: ${adminUser?.email || 'Admin'}</p>
                    <p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>
                  </div></body></html>`
              })
            });
          }
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }

        return Response.json({ ok: true, data }, { headers: corsHeaders });
      }

      if (action === "bulk-credits") {
        if (!isSuperAdmin) {
          return Response.json({ error: "Super admin access required" }, { status: 403, headers: corsHeaders });
        }

        const { user_ids, p_delta, p_reason } = body;

        if (!Array.isArray(user_ids) || user_ids.length === 0) {
          return Response.json({ error: "user_ids must be a non-empty array" }, { status: 400, headers: corsHeaders });
        }

        console.log('Bulk credit update:', { count: user_ids.length, p_delta, p_reason });

        const results = {
          success: [] as string[],
          failed: [] as { user_id: string; error: string }[]
        };

        const { data: adminUser } = await svc.from('profiles').select('email').eq('id', user.id).single();

        for (const userId of user_ids) {
          try {
            const { data, error } = await userClient.rpc("admin_update_credits", {
              p_user_id: userId,
              p_delta,
              p_reason: p_reason || `Bulk credit ${p_delta > 0 ? 'addition' : 'deduction'}`
            });

            if (error) {
              results.failed.push({ user_id: userId, error: error.message });
              continue;
            }

            results.success.push(userId);

            // Send email notification
            try {
              const { data: targetUser } = await svc.from('profiles').select('email').eq('id', userId).single();

              if (targetUser?.email) {
                const oldCredits = (data as any)?.old_credits || 0;
                const newCredits = (data as any)?.new_credits || 0;

                await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: targetUser.email,
                    subject: p_delta > 0 ? 'Credits Added to Your Account' : 'Credits Deducted from Your Account',
                    html: `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: ${p_delta > 0 ? '#2563eb' : '#dc2626'};">${p_delta > 0 ? 'Credits Added' : 'Credits Deducted'}</h2>
                        <p>Hello,</p>
                        <p>Your account has been ${p_delta > 0 ? 'credited with' : 'debited'} <strong>${Math.abs(p_delta)} credits</strong>.</p>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                          <p style="margin: 5px 0;"><strong>Previous Balance:</strong> ${oldCredits} credits</p>
                          <p style="margin: 5px 0;"><strong>New Balance:</strong> ${newCredits} credits</p>
                          <p style="margin: 5px 0;"><strong>Reason:</strong> ${p_reason || `Bulk credit ${p_delta > 0 ? 'addition' : 'deduction'}`}</p>
                        </div>
                        <p style="font-size: 0.9em; color: #666;">Action performed by: ${adminUser?.email || 'Admin'}</p>
                        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>
                      </div></body></html>`
                  })
                });
              }
            } catch (emailError) {
              console.error('Failed to send email for user:', userId, emailError);
            }
          } catch (err: any) {
            results.failed.push({ user_id: userId, error: err.message || 'Unknown error' });
          }
        }

        return Response.json({
          ok: true,
          results,
          summary: {
            total: user_ids.length,
            succeeded: results.success.length,
            failed: results.failed.length
          }
        }, { headers: corsHeaders });
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
