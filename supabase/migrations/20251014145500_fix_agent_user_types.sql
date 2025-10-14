/*
  # Fix Agent User Types

  Updates profiles that have ren_number but missing user_type to be marked as 'agent'.
  This ensures existing agent accounts are properly identified.
*/

-- Update profiles with ren_number to have user_type = 'agent'
UPDATE public.profiles
SET user_type = 'agent', updated_at = now()
WHERE ren_number IS NOT NULL
  AND ren_number != ''
  AND (user_type IS NULL OR user_type != 'agent');

-- Add default listing and boosting credits if they're 0 or null for agents
UPDATE public.profiles
SET
  listing_credits = COALESCE(listing_credits, 0) +
    CASE WHEN COALESCE(listing_credits, 0) = 0 THEN 50 ELSE 0 END,
  boosting_credits = COALESCE(boosting_credits, 0) +
    CASE WHEN COALESCE(boosting_credits, 0) = 0 THEN 10 ELSE 0 END,
  updated_at = now()
WHERE user_type = 'agent'
  AND (listing_credits IS NULL OR listing_credits = 0 OR boosting_credits IS NULL OR boosting_credits = 0);
