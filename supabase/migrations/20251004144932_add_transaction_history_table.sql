/*
  # Add Transaction History Table

  1. New Tables
    - `transaction_history`
      - `id` (uuid, primary key) - Unique transaction identifier
      - `user_id` (uuid, foreign key) - User who performed the transaction
      - `action_type` (text) - Type of action (credit_add, credit_deduct, role_change, etc.)
      - `details` (jsonb) - Additional details about the transaction
      - `performed_by` (uuid, foreign key) - Admin/super_admin who performed the action
      - `created_at` (timestamptz) - When the transaction occurred

  2. Security
    - Enable RLS on `transaction_history` table
    - Only super_admins can view all transaction history
    - Regular admins can only view transactions they performed
    - Users can view their own transaction history

  3. Indexes
    - Index on user_id for fast lookups
    - Index on performed_by for admin history
    - Index on created_at for chronological sorting
*/

-- Create transaction_history table
CREATE TABLE IF NOT EXISTS public.transaction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON public.transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_performed_by ON public.transaction_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON public.transaction_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all transaction history
CREATE POLICY "Super admins can view all transactions"
  ON public.transaction_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Regular admins can view transactions they performed
CREATE POLICY "Admins can view their own transactions"
  ON public.transaction_history
  FOR SELECT
  TO authenticated
  USING (
    performed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can view their own transaction history
CREATE POLICY "Users can view their own transactions"
  ON public.transaction_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only admins and super_admins can insert transaction history
CREATE POLICY "Admins can create transaction records"
  ON public.transaction_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create helper function to log transactions
CREATE OR REPLACE FUNCTION public.log_transaction(
  p_user_id uuid,
  p_action_type text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  INSERT INTO public.transaction_history (user_id, action_type, details, performed_by)
  VALUES (p_user_id, p_action_type, p_details, auth.uid())
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_transaction(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.log_transaction(uuid, text, jsonb) TO authenticated;
