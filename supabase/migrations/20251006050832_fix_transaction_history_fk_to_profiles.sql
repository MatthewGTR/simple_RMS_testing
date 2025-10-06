/*
  # Fix Transaction History Foreign Keys to Point to Profiles

  1. Changes
    - Drop existing foreign key constraints pointing to auth.users
    - Add new foreign key constraints pointing to profiles table
    - This allows Supabase to properly join transaction_history with profiles
  
  2. Security
    - Maintains referential integrity with profiles table
    - Enables proper query joins for transaction history lookups
*/

-- Drop existing foreign keys pointing to auth.users
ALTER TABLE transaction_history
DROP CONSTRAINT IF EXISTS transaction_history_user_id_fkey;

ALTER TABLE transaction_history
DROP CONSTRAINT IF EXISTS transaction_history_performed_by_fkey;

-- Add foreign keys pointing to profiles table
ALTER TABLE transaction_history
ADD CONSTRAINT transaction_history_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE transaction_history
ADD CONSTRAINT transaction_history_performed_by_fkey
FOREIGN KEY (performed_by)
REFERENCES profiles(id)
ON DELETE SET NULL;
