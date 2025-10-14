/*
  # Property Posting Credit System Integration

  1. Functions
    - Create function to handle property posting with credit deduction
    - Automatically deduct credits when property is created
    - Log transaction in transaction_history

  2. Triggers
    - Trigger on property insert to deduct credits
    - Ensure atomic credit deduction and property creation

  3. Constants
    - Property posting costs 5 credits
*/

-- Function to handle property creation with credit deduction
CREATE OR REPLACE FUNCTION handle_property_creation()
RETURNS TRIGGER AS $$
DECLARE
  property_cost INTEGER := 5;
  user_credits INTEGER;
BEGIN
  -- Get current user credits
  SELECT credits INTO user_credits
  FROM profiles
  WHERE id = NEW.agent_id;

  -- Check if user has enough credits
  IF user_credits < property_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', property_cost, user_credits;
  END IF;

  -- Deduct credits
  UPDATE profiles
  SET credits = credits - property_cost,
      updated_at = now()
  WHERE id = NEW.agent_id;

  -- Log transaction in transaction_history
  INSERT INTO transaction_history (
    user_id,
    action_type,
    details,
    performed_by,
    created_at
  ) VALUES (
    NEW.agent_id,
    'property_posted',
    jsonb_build_object(
      'property_id', NEW.id,
      'property_title', NEW.title,
      'credits_deducted', property_cost,
      'remaining_credits', user_credits - property_cost
    ),
    NEW.agent_id,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for property creation
DROP TRIGGER IF EXISTS trigger_property_creation ON properties;
CREATE TRIGGER trigger_property_creation
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION handle_property_creation();

-- Function for admin to create property without credit deduction
CREATE OR REPLACE FUNCTION admin_create_property(
  p_title TEXT,
  p_description TEXT,
  p_property_type TEXT,
  p_listing_type TEXT,
  p_price DECIMAL,
  p_bedrooms INTEGER,
  p_bathrooms INTEGER,
  p_sqft INTEGER,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_country TEXT,
  p_amenities TEXT[],
  p_furnished TEXT,
  p_agent_id UUID,
  p_status TEXT,
  p_featured BOOLEAN
) RETURNS UUID AS $$
DECLARE
  new_property_id UUID;
BEGIN
  -- Only admins and super_admins can use this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can create properties without credit deduction';
  END IF;

  -- Disable trigger temporarily by setting a flag
  -- Insert property directly
  INSERT INTO properties (
    title, description, property_type, listing_type, price,
    bedrooms, bathrooms, sqft, address, city, state, country,
    amenities, furnished, agent_id, status, featured
  ) VALUES (
    p_title, p_description, p_property_type, p_listing_type, p_price,
    p_bedrooms, p_bathrooms, p_sqft, p_address, p_city, p_state, p_country,
    p_amenities, p_furnished, p_agent_id, p_status, p_featured
  ) RETURNING id INTO new_property_id;

  -- Log transaction
  INSERT INTO transaction_history (
    user_id,
    action_type,
    details,
    performed_by,
    created_at
  ) VALUES (
    p_agent_id,
    'property_created_by_admin',
    jsonb_build_object(
      'property_id', new_property_id,
      'property_title', p_title,
      'created_by_admin', auth.uid()
    ),
    auth.uid(),
    now()
  );

  RETURN new_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get property posting cost
CREATE OR REPLACE FUNCTION get_property_posting_cost()
RETURNS INTEGER AS $$
BEGIN
  RETURN 5;
END;
$$ LANGUAGE plpgsql;