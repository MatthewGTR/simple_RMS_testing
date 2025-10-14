/*
  # Add Property Images Support

  1. Changes
    - Add image_urls array column to properties table
    - Add main_image_url column for primary image
    - Update existing properties with placeholder images
    
  2. Notes
    - Supports multiple images per property
    - Main image used for cards/thumbnails
*/

-- Add image columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE properties ADD COLUMN image_urls TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'main_image_url'
  ) THEN
    ALTER TABLE properties ADD COLUMN main_image_url TEXT;
  END IF;
END $$;

-- Update existing properties with Pexels stock images
UPDATE properties SET 
  main_image_url = 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
  image_urls = ARRAY[
    'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg',
    'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg'
  ]
WHERE property_type = 'condo';

UPDATE properties SET 
  main_image_url = 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg',
  image_urls = ARRAY[
    'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg',
    'https://images.pexels.com/photos/206172/pexels-photo-206172.jpeg',
    'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg'
  ]
WHERE property_type = 'house';

UPDATE properties SET 
  main_image_url = 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg',
  image_urls = ARRAY[
    'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg',
    'https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg',
    'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg'
  ]
WHERE property_type = 'villa';

UPDATE properties SET 
  main_image_url = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
  image_urls = ARRAY[
    'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
    'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg',
    'https://images.pexels.com/photos/1358912/pexels-photo-1358912.jpeg'
  ]
WHERE property_type = 'apartment';

UPDATE properties SET 
  main_image_url = 'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg',
  image_urls = ARRAY[
    'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg',
    'https://images.pexels.com/photos/2079234/pexels-photo-2079234.jpeg',
    'https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg'
  ]
WHERE property_type = 'studio';

UPDATE properties SET 
  main_image_url = 'https://images.pexels.com/photos/2416653/pexels-photo-2416653.jpeg',
  image_urls = ARRAY[
    'https://images.pexels.com/photos/2416653/pexels-photo-2416653.jpeg',
    'https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg',
    'https://images.pexels.com/photos/3288100/pexels-photo-3288100.jpeg'
  ]
WHERE property_type = 'shophouse';
