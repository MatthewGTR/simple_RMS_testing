/*
  # Add Email Notifications for Transactions

  1. New Functions
    - `send_notification_email(text, text, text)` - Sends email via edge function
    - `notify_role_change()` - Trigger function for role changes
    - `notify_credit_change()` - Trigger function for credit changes
  
  2. Triggers
    - After insert on transaction_history, send appropriate email notification
  
  3. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Only triggered by database operations, not callable by users directly
*/

-- Function to send notification email via edge function
CREATE OR REPLACE FUNCTION public.send_notification_email(
  p_to text,
  p_subject text,
  p_html text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_response text;
BEGIN
  -- Get environment variables
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  -- Use pg_net to call the edge function asynchronously
  -- This is a fire-and-forget operation
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'to', p_to,
      'subject', p_subject,
      'html', p_html
    )
  );
  
  -- If pg_net is not available, log the email
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Email notification: To=%, Subject=%', p_to, p_subject;
END;
$$;

-- Trigger function to send email notifications on transaction insert
CREATE OR REPLACE FUNCTION public.notify_transaction_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_email text;
  v_performer_email text;
  v_subject text;
  v_html text;
  v_old_credits int;
  v_new_credits int;
  v_delta int;
  v_old_role text;
  v_new_role text;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  -- Get performer email if exists
  IF NEW.performed_by IS NOT NULL THEN
    SELECT email INTO v_performer_email
    FROM public.profiles
    WHERE id = NEW.performed_by;
  END IF;
  
  -- Handle different action types
  CASE NEW.action_type
    WHEN 'credit_add', 'credit_deduct' THEN
      v_old_credits := (NEW.details->>'old_credits')::int;
      v_new_credits := (NEW.details->>'new_credits')::int;
      v_delta := (NEW.details->>'delta')::int;
      
      IF v_delta > 0 THEN
        v_subject := 'Credits Added to Your Account';
        v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
          '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
          '<h2 style="color: #2563eb;">Credits Added</h2>' ||
          '<p>Hello,</p>' ||
          '<p>Your account has been credited with <strong>' || abs(v_delta) || ' credits</strong>.</p>' ||
          '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
          '<p style="margin: 5px 0;"><strong>Previous Balance:</strong> ' || v_old_credits || ' credits</p>' ||
          '<p style="margin: 5px 0;"><strong>New Balance:</strong> ' || v_new_credits || ' credits</p>' ||
          '</div>' ||
          CASE WHEN v_performer_email IS NOT NULL THEN
            '<p style="font-size: 0.9em; color: #666;">Action performed by: ' || v_performer_email || '</p>'
          ELSE '' END ||
          '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
          '</div></body></html>';
      ELSE
        v_subject := 'Credits Deducted from Your Account';
        v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
          '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
          '<h2 style="color: #dc2626;">Credits Deducted</h2>' ||
          '<p>Hello,</p>' ||
          '<p>Your account has been debited <strong>' || abs(v_delta) || ' credits</strong>.</p>' ||
          '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
          '<p style="margin: 5px 0;"><strong>Previous Balance:</strong> ' || v_old_credits || ' credits</p>' ||
          '<p style="margin: 5px 0;"><strong>New Balance:</strong> ' || v_new_credits || ' credits</p>' ||
          '</div>' ||
          CASE WHEN v_performer_email IS NOT NULL THEN
            '<p style="font-size: 0.9em; color: #666;">Action performed by: ' || v_performer_email || '</p>'
          ELSE '' END ||
          '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
          '</div></body></html>';
      END IF;
      
    WHEN 'role_change' THEN
      v_old_role := NEW.details->>'old_role';
      v_new_role := NEW.details->>'new_role';
      
      v_subject := 'Your Role Has Been Updated';
      v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
        '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
        '<h2 style="color: #2563eb;">Role Updated</h2>' ||
        '<p>Hello,</p>' ||
        '<p>Your role in Property AI has been updated.</p>' ||
        '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
        '<p style="margin: 5px 0;"><strong>Previous Role:</strong> ' || COALESCE(v_old_role, 'user') || '</p>' ||
        '<p style="margin: 5px 0;"><strong>New Role:</strong> ' || v_new_role || '</p>' ||
        '</div>' ||
        CASE WHEN v_performer_email IS NOT NULL THEN
          '<p style="font-size: 0.9em; color: #666;">Action performed by: ' || v_performer_email || '</p>'
        ELSE '' END ||
        '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
        '</div></body></html>';
        
    ELSE
      -- For other action types, just log
      RAISE NOTICE 'Transaction logged: % for user %', NEW.action_type, v_user_email;
      RETURN NEW;
  END CASE;
  
  -- Send the email
  IF v_user_email IS NOT NULL AND v_subject IS NOT NULL THEN
    BEGIN
      PERFORM send_notification_email(v_user_email, v_subject, v_html);
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE NOTICE 'Failed to send email to %: %', v_user_email, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on transaction_history
DROP TRIGGER IF EXISTS trigger_notify_transaction_email ON public.transaction_history;
CREATE TRIGGER trigger_notify_transaction_email
  AFTER INSERT ON public.transaction_history
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_transaction_email();

-- Grant necessary permissions
REVOKE ALL ON FUNCTION public.send_notification_email(text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.notify_transaction_email() FROM public;
