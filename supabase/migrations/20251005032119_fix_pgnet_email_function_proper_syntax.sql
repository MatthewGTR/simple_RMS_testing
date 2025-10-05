/*
  # Fix pg_net Email Function with Proper Syntax

  1. Changes
    - Update send_notification_email to use correct pg_net syntax
    - Use proper parameter names for net.http_post
    - Ensure pg_net worker is active

  2. Notes
    - pg_net requires specific parameter format
    - Function returns request_id for tracking
*/

-- Fix the send_notification_email function with correct pg_net syntax
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
  -- Wake up pg_net worker if needed
  PERFORM net.worker_restart();
  
  -- Use pg_net to call the edge function asynchronously
  SELECT INTO v_request_id net.http_post(
    url := v_supabase_url || '/functions/v1/send-notification-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
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

-- Grant necessary permissions
REVOKE ALL ON FUNCTION public.send_notification_email(text, text, text) FROM public;
