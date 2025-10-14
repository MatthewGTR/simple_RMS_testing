/*
  # Add Featured and Banner System for Properties

  1. Changes
    - Add is_featured column (for featured listings section)
    - Add is_premium column (for premium banner placement)
    - Add featured_until timestamp (expiry for featured status)
    - Add premium_until timestamp (expiry for premium status)
    - Add boost_count to track number of times boosted
    
  2. Notes
    - Featured properties appear in special sections
    - Premium properties get banner placements
    - Both have expiry dates for time-limited promotions
*/

-- Add featured and banner columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE properties ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE properties ADD COLUMN is_premium BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'featured_until'
  ) THEN
    ALTER TABLE properties ADD COLUMN featured_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'premium_until'
  ) THEN
    ALTER TABLE properties ADD COLUMN premium_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'boost_count'
  ) THEN
    ALTER TABLE properties ADD COLUMN boost_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index for featured properties
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(is_featured, featured_until) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_properties_premium ON properties(is_premium, premium_until) WHERE status = 'active';
