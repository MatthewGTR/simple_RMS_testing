import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return Response.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use Resend API for sending emails
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, logging email instead:");
      console.log({
        to,
        subject,
        html_preview: html.substring(0, 100) + "..."
      });
      return Response.json(
        { success: true, message: "Email logged (RESEND_API_KEY not configured)" },
        { headers: corsHeaders }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CreditApp <notifications@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const data = await emailResponse.json();
    console.log("Email sent successfully:", { to, subject, id: data.id });

    return Response.json(
      { success: true, emailId: data.id },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    console.error("Edge function error:", e);
    const errorMessage = e?.message || JSON.stringify(e);
    return Response.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
});
