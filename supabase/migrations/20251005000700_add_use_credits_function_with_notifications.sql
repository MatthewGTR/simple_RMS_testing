/*
  # Add Use Credits Function with Email Notifications

  1. New Functions
    - `use_credits(integer, text)` - Deduct credits from user's account
      - Validates user has enough credits
      - Logs transaction with usage details
      - Automatically triggers email notification via trigger

  2. Security
    - Function uses SECURITY DEFINER to ensure it can update credits
    - Only authenticated users can use their own credits
    - Transaction log ensures audit trail

  3. Email Notifications
    - Existing trigger will automatically send email when transaction is logged
    - Email will show credit usage details
*/

-- Function to use/deduct credits
CREATE OR REPLACE FUNCTION public.use_credits(
  p_amount integer,
  p_reason text DEFAULT 'Credit usage'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_old_credits integer;
  v_new_credits integer;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Get current credits
  SELECT credits INTO v_old_credits
  FROM public.profiles
  WHERE id = v_user_id;
  
  IF v_old_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Check if user has enough credits
  IF v_old_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', v_old_credits, p_amount;
  END IF;
  
  -- Calculate new balance
  v_new_credits := v_old_credits - p_amount;
  
  -- Update user credits
  UPDATE public.profiles
  SET credits = v_new_credits,
      updated_at = now()
  WHERE id = v_user_id;
  
  -- Log the transaction (this will trigger email notification)
  PERFORM public.log_transaction(
    v_user_id,
    'credit_usage',
    jsonb_build_object(
      'old_credits', v_old_credits,
      'new_credits', v_new_credits,
      'amount_used', p_amount,
      'reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_credits', v_old_credits,
    'new_credits', v_new_credits,
    'amount_used', p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.use_credits(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.use_credits(integer, text) TO authenticated;

-- Update the notification trigger to handle credit_usage
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
  v_amount_used int;
  v_reason text;
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
      
    WHEN 'credit_usage' THEN
      v_old_credits := (NEW.details->>'old_credits')::int;
      v_new_credits := (NEW.details->>'new_credits')::int;
      v_amount_used := (NEW.details->>'amount_used')::int;
      v_reason := NEW.details->>'reason';
      
      v_subject := 'Credits Used - Transaction Confirmation';
      v_html := '<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' ||
        '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' ||
        '<h2 style="color: #059669;">Transaction Confirmed</h2>' ||
        '<p>Hello,</p>' ||
        '<p>You have successfully used <strong>' || v_amount_used || ' credits</strong>.</p>' ||
        '<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">' ||
        '<p style="margin: 5px 0;"><strong>Amount Used:</strong> ' || v_amount_used || ' credits</p>' ||
        '<p style="margin: 5px 0;"><strong>Reason:</strong> ' || v_reason || '</p>' ||
        '<p style="margin: 5px 0;"><strong>Previous Balance:</strong> ' || v_old_credits || ' credits</p>' ||
        '<p style="margin: 5px 0;"><strong>New Balance:</strong> ' || v_new_credits || ' credits</p>' ||
        '</div>' ||
        '<p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using Property AI!</p>' ||
        '</div></body></html>';
      
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
