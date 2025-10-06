/*
  # Update Branding from CreditApp to Property AI

  1. Changes
    - Update all email notification functions to use "Property AI" instead of "CreditApp"
    - This affects the email templates for credit changes and role changes
  
  2. Security
    - No security changes, only branding updates
*/

-- Update notify_credit_change function with Property AI branding
CREATE OR REPLACE FUNCTION public.notify_credit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_email text;
  v_user_name text;
  v_delta integer;
  v_old_credits integer;
  v_new_credits integer;
  v_reason text;
  v_subject text;
  v_html text;
  v_admin_email text;
BEGIN
  IF NEW.action_type IN ('credit_add', 'credit_deduct', 'credit_used') THEN
    SELECT email, full_name INTO v_user_email, v_user_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF NEW.performed_by IS NOT NULL THEN
      SELECT email INTO v_admin_email
      FROM public.profiles
      WHERE id = NEW.performed_by;
    END IF;

    v_delta := (NEW.details->>'delta')::integer;
    v_old_credits := (NEW.details->>'old_credits')::integer;
    v_new_credits := (NEW.details->>'new_credits')::integer;
    v_reason := NEW.details->>'reason';

    IF NEW.action_type = 'credit_add' THEN
      v_subject := 'Credits Added to Your Account';
      v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
        '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
        '<h2 style="color: #2563eb;">Credits Added</h2>' ||
        '<p>Hello ' || COALESCE(v_user_name, 'there') || ',</p>' ||
        '<p>Your account has been credited with <strong style="color: #10b981;">' || v_delta || ' credits</strong>.</p>' ||
        '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
        '<p style="margin: 5px 0;"><strong>Previous Balance:</strong> ' || v_old_credits || ' credits</p>' ||
        '<p style="margin: 5px 0;"><strong>New Balance:</strong> ' || v_new_credits || ' credits</p>' ||
        '</div>' ||
        '<p style="font-size: 0.9em; color: #666;">Action performed by: ' || COALESCE(v_admin_email, 'System') || '</p>' ||
        '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
        '</div></body></html>';
    ELSIF NEW.action_type = 'credit_deduct' THEN
      v_subject := 'Credits Deducted from Your Account';
      v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
        '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
        '<h2 style="color: #ef4444;">Credits Deducted</h2>' ||
        '<p>Hello ' || COALESCE(v_user_name, 'there') || ',</p>' ||
        '<p><strong style="color: #ef4444;">' || ABS(v_delta) || ' credits</strong> have been deducted from your account.</p>' ||
        '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
        '<p style="margin: 5px 0;"><strong>Previous Balance:</strong> ' || v_old_credits || ' credits</p>' ||
        '<p style="margin: 5px 0;"><strong>New Balance:</strong> ' || v_new_credits || ' credits</p>' ||
        '</div>' ||
        '<p style="font-size: 0.9em; color: #666;">Action performed by: ' || COALESCE(v_admin_email, 'System') || '</p>' ||
        '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
        '</div></body></html>';
    ELSE
      v_subject := 'Credits Used';
      v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
        '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
        '<h2 style="color: #f59e0b;">Credits Used</h2>' ||
        '<p>Hello ' || COALESCE(v_user_name, 'there') || ',</p>' ||
        '<p>You have used <strong style="color: #f59e0b;">' || ABS(v_delta) || ' credits</strong>.</p>' ||
        '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
        '<p style="margin: 5px 0;"><strong>Remaining Balance:</strong> ' || v_new_credits || ' credits</p>' ||
        '</div>' ||
        '<p style="font-size: 0.9em; color: #666;">Reason: ' || COALESCE(v_reason, 'Credit usage') || '</p>' ||
        '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
        '</div></body></html>';
    END IF;

    PERFORM public.send_notification_email(v_user_email, v_subject, v_html);
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_role_change function with Property AI branding
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_email text;
  v_user_name text;
  v_old_role text;
  v_new_role text;
  v_subject text;
  v_html text;
BEGIN
  IF NEW.action_type = 'role_change' THEN
    SELECT email, full_name INTO v_user_email, v_user_name
    FROM public.profiles
    WHERE id = NEW.user_id;

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
      '<p style="font-size: 0.9em; color: #666;">If you have any questions, please contact support.</p>' ||
      '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
      '</div></body></html>';

    PERFORM public.send_notification_email(v_user_email, v_subject, v_html);
  END IF;

  RETURN NEW;
END;
$$;
