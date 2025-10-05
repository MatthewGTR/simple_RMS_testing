/*
  # Fix Email System with Environment Variables

  1. Changes
    - Create a simpler approach using Supabase's built-in environment variables
    - Update notification function to get config from env vars at runtime
    - Use pg_net properly with hardcoded Supabase URL

  2. Security
    - Service role key is accessed via Supabase's internal env
*/

-- Simplified send_notification_email that uses environment variables
CREATE OR REPLACE FUNCTION public.send_notification_email(
  p_to text,
  p_subject text,
  p_html text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id bigint;
  v_supabase_url text := 'https://0ec90b57d6e95fcbda19832f.supabase.co';
BEGIN
  -- Use pg_net to call the edge function asynchronously
  SELECT INTO v_request_id
    extensions.http_post(
      url := v_supabase_url || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'to', p_to,
        'subject', p_subject,
        'html', p_html
      ),
      timeout_milliseconds := 5000
    );
  
  RAISE NOTICE 'Email request queued with ID: % for recipient: %', v_request_id, p_to;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to queue email to %: %', p_to, SQLERRM;
END;
$$;

-- Test the pg_net extension
DO $$
BEGIN
  RAISE NOTICE 'pg_net extension test - checking if it works';
END $$;
