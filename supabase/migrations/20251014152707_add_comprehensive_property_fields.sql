/*
  # Add Comprehensive Property Fields
  
  Based on iProperty.com and PropertyGuru Malaysia standards
  
  1. New Fields Added
    - postal_code: Postal/ZIP code for property
    - land_area_sqft: Land area in square feet (separate from built-up)
    - car_parks: Number of parking spaces
    - floor_level: Which floor the unit is on
    - tenure_type: Freehold, Leasehold, etc.
    - build_year: Year property was built/completed
    - occupancy_status: Ready to move, under construction, etc.
    - facing_direction: North, South, East, West, etc.
    - unit_number: Unit/house number
    - lot_number: Lot/parcel number
    - psf_price: Price per square foot (calculated)
    - virtual_tour_url: 360 tour or video URL
    - youtube_url: YouTube video URL
    - facilities: Additional facilities/amenities in detail
    
  2. Security
    - All fields properly indexed
    - RLS policies remain unchanged
*/

-- Add postal_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE properties ADD COLUMN postal_code TEXT;
  END IF;
END $$;

-- Add land area (separate from built-up area)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'land_area_sqft'
  ) THEN
    ALTER TABLE properties ADD COLUMN land_area_sqft INTEGER;
  END IF;
END $$;

-- Add car parks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'car_parks'
  ) THEN
    ALTER TABLE properties ADD COLUMN car_parks INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add floor level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'floor_level'
  ) THEN
    ALTER TABLE properties ADD COLUMN floor_level TEXT;
  END IF;
END $$;

-- Add tenure type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'tenure_type'
  ) THEN
    ALTER TABLE properties ADD COLUMN tenure_type TEXT CHECK (tenure_type IN ('freehold', 'leasehold_99', 'leasehold_999', 'leasehold_other', 'malay_reserve'));
  END IF;
END $$;

-- Add build year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'build_year'
  ) THEN
    ALTER TABLE properties ADD COLUMN build_year INTEGER;
  END IF;
END $$;

-- Add occupancy status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'occupancy_status'
  ) THEN
    ALTER TABLE properties ADD COLUMN occupancy_status TEXT CHECK (occupancy_status IN ('ready', 'under_construction', 'vacant', 'tenanted'));
  END IF;
END $$;

-- Add facing direction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'facing_direction'
  ) THEN
    ALTER TABLE properties ADD COLUMN facing_direction TEXT CHECK (facing_direction IN ('north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'));
  END IF;
END $$;

-- Add unit number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'unit_number'
  ) THEN
    ALTER TABLE properties ADD COLUMN unit_number TEXT;
  END IF;
END $$;

-- Add lot number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'lot_number'
  ) THEN
    ALTER TABLE properties ADD COLUMN lot_number TEXT;
  END IF;
END $$;

-- Add PSF price (calculated field, can be stored for quick access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'psf_price'
  ) THEN
    ALTER TABLE properties ADD COLUMN psf_price DECIMAL(10,2);
  END IF;
END $$;

-- Add virtual tour URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'virtual_tour_url'
  ) THEN
    ALTER TABLE properties ADD COLUMN virtual_tour_url TEXT;
  END IF;
END $$;

-- Add YouTube URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'youtube_url'
  ) THEN
    ALTER TABLE properties ADD COLUMN youtube_url TEXT;
  END IF;
END $$;

-- Add facilities (more detailed than amenities)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'facilities'
  ) THEN
    ALTER TABLE properties ADD COLUMN facilities TEXT;
  END IF;
END $$;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_properties_postal_code ON properties(postal_code);
CREATE INDEX IF NOT EXISTS idx_properties_tenure_type ON properties(tenure_type);
CREATE INDEX IF NOT EXISTS idx_properties_build_year ON properties(build_year);
CREATE INDEX IF NOT EXISTS idx_properties_car_parks ON properties(car_parks);

-- Create a function to auto-calculate PSF price
CREATE OR REPLACE FUNCTION calculate_psf_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sqft > 0 THEN
    NEW.psf_price := NEW.price / NEW.sqft;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate PSF price
DROP TRIGGER IF EXISTS trigger_calculate_psf_price ON properties;
CREATE TRIGGER trigger_calculate_psf_price
  BEFORE INSERT OR UPDATE OF price, sqft ON properties
  FOR EACH ROW
  EXECUTE FUNCTION calculate_psf_price();

-- Update existing properties to calculate PSF price
UPDATE properties SET psf_price = price / NULLIF(sqft, 0) WHERE sqft > 0;