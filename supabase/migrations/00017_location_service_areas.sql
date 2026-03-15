-- ============================================================================
-- Location & Service Area Management
-- Phase 1J: Location/Service Area Management
-- ============================================================================

-- ============================================================================
-- 1. Service Areas Table
-- Defines geographic coverage for each tenant location
-- ============================================================================

CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES tenant_locations(id) ON DELETE CASCADE,

  -- Area name for reference
  name TEXT NOT NULL,

  -- Area type determines how coverage is defined
  area_type TEXT NOT NULL CHECK (area_type IN ('radius', 'polygon', 'zip_codes')),

  -- For radius type: center point and distance
  center_latitude NUMERIC(10, 7),
  center_longitude NUMERIC(10, 7),
  radius_miles NUMERIC(6, 2),

  -- For polygon type: array of coordinate pairs
  polygon_coordinates JSONB, -- [{lat: number, lng: number}, ...]

  -- For zip_codes type: array of zip codes
  zip_codes TEXT[],

  -- Priority (lower = higher priority when areas overlap)
  priority INTEGER NOT NULL DEFAULT 0,

  -- Surcharge for this area (e.g., for distant areas)
  surcharge_type TEXT CHECK (surcharge_type IN ('flat', 'percentage', 'per_mile')),
  surcharge_value NUMERIC(10, 2),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_areas_tenant ON service_areas(tenant_id);
CREATE INDEX idx_service_areas_location ON service_areas(location_id);
CREATE INDEX idx_service_areas_active ON service_areas(tenant_id, is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_service_areas_updated_at
  BEFORE UPDATE ON service_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Add geocoding fields to tenant_locations if not present
-- ============================================================================

ALTER TABLE tenant_locations
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- ============================================================================
-- 3. RLS Policies for service_areas
-- ============================================================================

ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_areas_tenant_isolation" ON service_areas
  FOR ALL
  USING (tenant_id = get_active_tenant_id())
  WITH CHECK (tenant_id = get_active_tenant_id());

-- ============================================================================
-- 4. Location CRUD RPCs
-- ============================================================================

-- Create or update a location
CREATE OR REPLACE FUNCTION upsert_tenant_location(
  p_location_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_address_line1 TEXT DEFAULT NULL,
  p_address_line2 TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'US',
  p_timezone TEXT DEFAULT 'America/New_York',
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_google_place_id TEXT DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT FALSE,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_location_id UUID;
  v_result RECORD;
BEGIN
  -- Get tenant from active workspace
  v_tenant_id := get_active_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- If setting as primary, unset any existing primary
  IF p_is_primary THEN
    UPDATE tenant_locations
    SET is_primary = FALSE, updated_at = NOW()
    WHERE tenant_id = v_tenant_id AND is_primary = TRUE;
  END IF;

  IF p_location_id IS NOT NULL THEN
    -- Update existing
    UPDATE tenant_locations
    SET
      name = COALESCE(p_name, name),
      address_line1 = COALESCE(p_address_line1, address_line1),
      address_line2 = p_address_line2,
      city = COALESCE(p_city, city),
      state = COALESCE(p_state, state),
      postal_code = COALESCE(p_postal_code, postal_code),
      country = COALESCE(p_country, country),
      timezone = COALESCE(p_timezone, timezone),
      phone = p_phone,
      email = p_email,
      latitude = p_latitude,
      longitude = p_longitude,
      google_place_id = p_google_place_id,
      is_primary = p_is_primary,
      is_active = p_is_active,
      updated_at = NOW()
    WHERE id = p_location_id AND tenant_id = v_tenant_id
    RETURNING id INTO v_location_id;

    IF v_location_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Location not found');
    END IF;
  ELSE
    -- Create new
    INSERT INTO tenant_locations (
      tenant_id, name, address_line1, address_line2, city, state, postal_code,
      country, timezone, phone, email, latitude, longitude, google_place_id,
      is_primary, is_active
    )
    VALUES (
      v_tenant_id, p_name, p_address_line1, p_address_line2, p_city, p_state, p_postal_code,
      p_country, p_timezone, p_phone, p_email, p_latitude, p_longitude, p_google_place_id,
      p_is_primary, p_is_active
    )
    RETURNING id INTO v_location_id;
  END IF;

  -- Fetch the result
  SELECT * INTO v_result FROM tenant_locations WHERE id = v_location_id;

  RETURN jsonb_build_object(
    'success', true,
    'location_id', v_location_id,
    'location', row_to_json(v_result)
  );
END;
$$;

-- Delete a location
CREATE OR REPLACE FUNCTION delete_tenant_location(
  p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_primary BOOLEAN;
BEGIN
  v_tenant_id := get_active_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Check if it's the primary location
  SELECT is_primary INTO v_is_primary
  FROM tenant_locations
  WHERE id = p_location_id AND tenant_id = v_tenant_id;

  IF v_is_primary THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete primary location');
  END IF;

  -- Delete the location (cascades to service_areas)
  DELETE FROM tenant_locations
  WHERE id = p_location_id AND tenant_id = v_tenant_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 5. Service Area CRUD RPCs
-- ============================================================================

-- Create or update a service area
CREATE OR REPLACE FUNCTION upsert_service_area(
  p_area_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_area_type TEXT DEFAULT 'radius',
  p_center_latitude NUMERIC DEFAULT NULL,
  p_center_longitude NUMERIC DEFAULT NULL,
  p_radius_miles NUMERIC DEFAULT NULL,
  p_polygon_coordinates JSONB DEFAULT NULL,
  p_zip_codes TEXT[] DEFAULT NULL,
  p_priority INTEGER DEFAULT 0,
  p_surcharge_type TEXT DEFAULT NULL,
  p_surcharge_value NUMERIC DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_area_id UUID;
  v_result RECORD;
BEGIN
  v_tenant_id := get_active_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Validate area type requirements
  IF p_area_type = 'radius' AND (p_center_latitude IS NULL OR p_center_longitude IS NULL OR p_radius_miles IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Radius type requires center coordinates and radius');
  END IF;

  IF p_area_type = 'polygon' AND (p_polygon_coordinates IS NULL OR jsonb_array_length(p_polygon_coordinates) < 3) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Polygon type requires at least 3 coordinates');
  END IF;

  IF p_area_type = 'zip_codes' AND (p_zip_codes IS NULL OR array_length(p_zip_codes, 1) < 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Zip codes type requires at least one zip code');
  END IF;

  IF p_area_id IS NOT NULL THEN
    -- Update existing
    UPDATE service_areas
    SET
      name = COALESCE(p_name, name),
      area_type = COALESCE(p_area_type, area_type),
      center_latitude = p_center_latitude,
      center_longitude = p_center_longitude,
      radius_miles = p_radius_miles,
      polygon_coordinates = p_polygon_coordinates,
      zip_codes = p_zip_codes,
      priority = COALESCE(p_priority, priority),
      surcharge_type = p_surcharge_type,
      surcharge_value = p_surcharge_value,
      is_active = p_is_active,
      updated_at = NOW()
    WHERE id = p_area_id AND tenant_id = v_tenant_id
    RETURNING id INTO v_area_id;

    IF v_area_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Service area not found');
    END IF;
  ELSE
    -- Create new
    INSERT INTO service_areas (
      tenant_id, location_id, name, area_type,
      center_latitude, center_longitude, radius_miles,
      polygon_coordinates, zip_codes, priority,
      surcharge_type, surcharge_value, is_active
    )
    VALUES (
      v_tenant_id, p_location_id, p_name, p_area_type,
      p_center_latitude, p_center_longitude, p_radius_miles,
      p_polygon_coordinates, p_zip_codes, p_priority,
      p_surcharge_type, p_surcharge_value, p_is_active
    )
    RETURNING id INTO v_area_id;
  END IF;

  SELECT * INTO v_result FROM service_areas WHERE id = v_area_id;

  RETURN jsonb_build_object(
    'success', true,
    'area_id', v_area_id,
    'area', row_to_json(v_result)
  );
END;
$$;

-- Delete a service area
CREATE OR REPLACE FUNCTION delete_service_area(
  p_area_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_active_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  DELETE FROM service_areas
  WHERE id = p_area_id AND tenant_id = v_tenant_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 6. Location Resolution RPC
-- Determines which location serves a given property based on coordinates
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_property_location(
  p_property_id UUID DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_zip_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_zip TEXT;
  v_result RECORD;
  v_distance_miles NUMERIC;
  v_in_area BOOLEAN;
BEGIN
  v_tenant_id := get_active_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Get coordinates from property or parameters
  IF p_property_id IS NOT NULL THEN
    SELECT latitude, longitude, postal_code INTO v_lat, v_lng, v_zip
    FROM properties
    WHERE id = p_property_id AND tenant_id = v_tenant_id;
  ELSE
    v_lat := p_latitude;
    v_lng := p_longitude;
    v_zip := p_zip_code;
  END IF;

  -- Try to find a matching service area
  FOR v_result IN
    SELECT
      sa.*,
      tl.name as location_name,
      tl.id as location_id
    FROM service_areas sa
    JOIN tenant_locations tl ON tl.id = sa.location_id
    WHERE sa.tenant_id = v_tenant_id
      AND sa.is_active = TRUE
      AND tl.is_active = TRUE
    ORDER BY sa.priority ASC
  LOOP
    v_in_area := FALSE;

    -- Check based on area type
    IF v_result.area_type = 'radius' AND v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
      -- Calculate distance using Haversine formula (simplified)
      v_distance_miles := (
        3959 * acos(
          cos(radians(v_lat)) * cos(radians(v_result.center_latitude)) *
          cos(radians(v_result.center_longitude) - radians(v_lng)) +
          sin(radians(v_lat)) * sin(radians(v_result.center_latitude))
        )
      );
      v_in_area := v_distance_miles <= v_result.radius_miles;

    ELSIF v_result.area_type = 'zip_codes' AND v_zip IS NOT NULL THEN
      v_in_area := v_zip = ANY(v_result.zip_codes);

    ELSIF v_result.area_type = 'polygon' AND v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
      -- For polygon, we'd need a more complex point-in-polygon check
      -- For now, return a simplified check (would need PostGIS for production)
      v_in_area := FALSE; -- TODO: Implement proper polygon check or use PostGIS
    END IF;

    IF v_in_area THEN
      -- Update property's assigned location if we have a property_id
      IF p_property_id IS NOT NULL THEN
        UPDATE properties
        SET assigned_location_id = v_result.location_id, updated_at = NOW()
        WHERE id = p_property_id AND tenant_id = v_tenant_id;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'in_service_area', true,
        'location_id', v_result.location_id,
        'location_name', v_result.location_name,
        'area_id', v_result.id,
        'area_name', v_result.name,
        'distance_miles', v_distance_miles,
        'surcharge_type', v_result.surcharge_type,
        'surcharge_value', v_result.surcharge_value
      );
    END IF;
  END LOOP;

  -- No matching area found
  RETURN jsonb_build_object(
    'success', true,
    'in_service_area', false,
    'location_id', NULL,
    'message', 'Property is outside all service areas'
  );
END;
$$;

-- ============================================================================
-- 7. Check if location can be deleted (has no dependencies)
-- ============================================================================

CREATE OR REPLACE FUNCTION can_delete_location(
  p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_primary BOOLEAN;
  v_property_count INTEGER;
  v_booking_count INTEGER;
BEGIN
  v_tenant_id := get_active_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workspace');
  END IF;

  -- Check if primary
  SELECT is_primary INTO v_is_primary
  FROM tenant_locations
  WHERE id = p_location_id AND tenant_id = v_tenant_id;

  IF v_is_primary THEN
    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', 'Cannot delete primary location'
    );
  END IF;

  -- Count assigned properties
  SELECT COUNT(*) INTO v_property_count
  FROM properties
  WHERE assigned_location_id = p_location_id AND tenant_id = v_tenant_id;

  IF v_property_count > 0 THEN
    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', 'Location has ' || v_property_count || ' assigned properties'
    );
  END IF;

  RETURN jsonb_build_object('can_delete', true);
END;
$$;

-- ============================================================================
-- 8. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION upsert_tenant_location TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tenant_location TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_service_area TO authenticated;
GRANT EXECUTE ON FUNCTION delete_service_area TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_property_location TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_location TO authenticated;
