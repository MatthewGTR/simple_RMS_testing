/*
  # Update Credit System with Split Credits

  1. Changes
    - Add listing_credits column to profiles table
    - Add boosting_credits column to profiles table
    - Migrate existing credits to listing_credits
    - Update default values for new accounts
    
  2. Notes
    - listing_credits: Used for posting new properties
    - boosting_credits: Used for featured/premium listings
*/

-- Add new credit columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'listing_credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN listing_credits INTEGER DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'boosting_credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN boosting_credits INTEGER DEFAULT 5;
  END IF;
END $$;

-- Migrate existing credits to listing_credits for users who have credits
UPDATE profiles 
SET listing_credits = COALESCE(credits, 10),
    boosting_credits = 5
WHERE listing_credits IS NULL;

-- Update transaction_history table to support credit types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transaction_history' AND column_name = 'credit_type'
  ) THEN
    ALTER TABLE transaction_history ADD COLUMN credit_type TEXT DEFAULT 'listing' CHECK (credit_type IN ('listing', 'boosting'));
  END IF;
END $$;
