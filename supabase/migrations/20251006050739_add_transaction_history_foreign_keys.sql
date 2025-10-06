/*
  # Add Foreign Key Relationships to Transaction History

  1. Changes
    - Add foreign key constraint for `user_id` referencing `profiles(id)`
    - Add foreign key constraint for `performed_by` referencing `profiles(id)`
    - Both foreign keys use CASCADE on delete to maintain data integrity
  
  2. Security
    - Maintains referential integrity between transaction_history and profiles tables
    - Ensures transactions are always linked to valid user profiles
*/

-- Add foreign key for user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transaction_history_user_id_fkey'
    AND table_name = 'transaction_history'
  ) THEN
    ALTER TABLE transaction_history
    ADD CONSTRAINT transaction_history_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for performed_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transaction_history_performed_by_fkey'
    AND table_name = 'transaction_history'
  ) THEN
    ALTER TABLE transaction_history
    ADD CONSTRAINT transaction_history_performed_by_fkey
    FOREIGN KEY (performed_by)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;
