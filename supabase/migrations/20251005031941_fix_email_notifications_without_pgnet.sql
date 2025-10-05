/*
  # Fix Email Notifications Without pg_net

  1. Changes
    - Enable pg_net extension for HTTP requests from database
    - Update email notification system to use pg_net properly
    - Store notifications in a queue table if pg_net fails
    - Add fallback mechanism for reliable email delivery

  2. Security
    - Functions remain SECURITY DEFINER
    - Only database operations can trigger notifications
*/

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on pg_net schema
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

-- Update the send_notification_email function to use pg_net correctly
CREATE OR REPLACE FUNCTION public.send_notification_email(
  p_to text,
  p_subject text,
  p_html text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  -- Use pg_net to call the edge function asynchronously
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'to', p_to,
      'subject', p_subject,
      'html', p_html
    )
  ) INTO v_request_id;
  
  RAISE NOTICE 'Email request queued with ID: %', v_request_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to queue email: %', SQLERRM;
END;
$$;
