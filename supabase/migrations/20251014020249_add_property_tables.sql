/*
  # Add Property Management Tables

  1. New Tables
    - `properties` - Property listings with full details
    - `property_images` - Property image management
    - `inquiries` - Property inquiries from buyers
    - `favorites` - User saved properties
    - `property_views` - Track property view analytics

  2. Schema Updates
    - Add property-related fields to profiles table
    - Support for buyer, seller, agent user types

  3. Security
    - Enable RLS on all tables
    - Agents can manage their own properties
    - Admins can manage all properties
    - Buyers can view active properties and manage favorites

  4. Integration
    - Property posting deducts credits from agent
    - Transaction history tracks property operations
*/

-- Add property-related fields to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'company'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN license_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  property_type text NOT NULL CHECK (property_type IN ('house', 'apartment', 'condo', 'villa', 'studio', 'shophouse')),
  listing_type text NOT NULL CHECK (listing_type IN ('sale', 'rent')) DEFAULT 'sale',
  price decimal(12,2) NOT NULL,
  bedrooms integer NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 0,
  sqft integer NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text DEFAULT 'Malaysia',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  amenities text[] DEFAULT '{}',
  furnished text CHECK (furnished IN ('fully_furnished', 'partially_furnished', 'unfurnished')),
  availability_date date,
  deposit_info text,
  agent_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'sold', 'rented', 'inactive')) DEFAULT 'draft',
  featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Property images table
CREATE TABLE IF NOT EXISTS property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  inquirer_id uuid REFERENCES profiles(id),
  inquirer_name text NOT NULL,
  inquirer_email text NOT NULL,
  inquirer_phone text,
  message text NOT NULL,
  inquiry_type text NOT NULL CHECK (inquiry_type IN ('viewing', 'general', 'price', 'financing')) DEFAULT 'general',
  status text NOT NULL CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'closed')) DEFAULT 'new',
  agent_response text,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Property views tracking table
CREATE TABLE IF NOT EXISTS property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES profiles(id),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Anyone can view active properties"
  ON properties FOR SELECT
  USING (status = 'active' OR auth.uid() = agent_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Agents can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'agent'
  ));

CREATE POLICY "Agents can update own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ))
  WITH CHECK (auth.uid() = agent_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Agents and admins can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (auth.uid() = agent_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Property images policies
CREATE POLICY "Anyone can view property images"
  ON property_images FOR SELECT
  USING (true);

CREATE POLICY "Agents can manage images for their properties"
  ON property_images FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND (p.agent_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND (p.agent_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  ));

-- Inquiries policies
CREATE POLICY "Users can create inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agents can view inquiries for their properties"
  ON inquiries FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND (p.agent_id = auth.uid() OR auth.uid() = inquirer_id OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  ));

CREATE POLICY "Agents can update inquiries for their properties"
  ON inquiries FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND p.agent_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND p.agent_id = auth.uid()
  ));

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Property views policies (insert only for tracking)
CREATE POLICY "Anyone can log property views"
  ON property_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all property views"
  ON property_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);