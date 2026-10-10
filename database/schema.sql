-- Database schema for bus-in-live
-- PostgreSQL + Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable btree_gist extension for GiST indexes on primitive types
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to set updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Routes
CREATE TABLE routes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  type TEXT DEFAULT 'regular' CHECK (type IN ('regular', 'especial')),
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'delay', 'detour', 'temporary_detour', 'suspended', 'out_of_service', 'insufficient_info')),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  city TEXT DEFAULT 'Santa Ana',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Trigger for routes
CREATE TRIGGER update_routes_updated_at
BEFORE UPDATE ON routes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Route Variants
CREATE TABLE route_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variant_type TEXT,
  direct BOOLEAN DEFAULT FALSE, -- TRUE = directo, FALSE = no directo
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stops
CREATE TABLE stops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  stop_type TEXT DEFAULT 'normal' CHECK (stop_type IN ('normal', 'terminal', 'start', 'end', 'intermediate')),
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Route Stops (junction table)
CREATE TABLE route_stops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES route_variants(id),
  stop_id UUID REFERENCES stops(id),
  sequence INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Route Shapes (GeoJSON geometry)
CREATE TABLE route_shapes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES route_variants(id),
  geometry JSONB NOT NULL, -- GeoJSON LineString: {"type": "LineString", "coordinates": [[lon1, lat1], [lon2, lat2], ...]}
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip Sessions (user traveling)
CREATE TABLE trip_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  variant_id UUID REFERENCES route_variants(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  consent BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'))
);

-- Location Points (GPS points from trips)
CREATE TABLE location_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_session_id UUID REFERENCES trip_sessions(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Bus Observations (processed data from location points)
CREATE TABLE bus_observations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  variant_id UUID REFERENCES route_variants(id),
  trip_session_id UUID REFERENCES trip_sessions(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  route_progress DOUBLE PRECISION, -- 0.0 a 1.0
  speed DOUBLE PRECISION,
  confidence TEXT DEFAULT 'low' CHECK (confidence IN ('high', 'medium', 'low', 'insufficient')),
  observed_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'user' CHECK (source IN ('user', 'historical', 'calculated'))
);

-- Incidents
CREATE TABLE incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  variant_id UUID REFERENCES route_variants(id),
  type TEXT NOT NULL CHECK (type IN ('accident', 'traffic', 'breakdown', 'blockage', 'detour', 'suspended', 'other')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location JSONB, -- Optional: {"type": "Point", "coordinates": [lon, lat]}
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired')),
  severity_level INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Detours
CREATE TABLE detours (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  original_shape_id UUID REFERENCES route_shapes(id),
  temporary_shape JSONB, -- GeoJSON geometry
  reason TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports (community reports)
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  route_id UUID REFERENCES routes(id),
  stop_id UUID REFERENCES stops(id),
  type TEXT NOT NULL CHECK (type IN ('accident', 'traffic', 'breakdown', 'no_show', 'suspended', 'detour', 'incorrect_info', 'incorrect_stop', 'incorrect_route', 'incorrect_eta', 'other')),
  location JSONB,
  description TEXT NOT NULL,
  evidence TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'resolved')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Route Change Requests (admin moderation)
CREATE TABLE route_change_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  old_data JSONB,
  proposed_data JSONB,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deletion Requests (soft delete requests)
CREATE TABLE deletion_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  reason TEXT,
  evidence TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  stop_id UUID REFERENCES stops(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, route_id, stop_id)
);

-- Search History
CREATE TABLE search_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- 'route', 'stop', 'report'
  reference_id UUID, -- ID de la ruta/parada/reporte buscado
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'route_changes', 'incidents', 'reports', 'eta', 'favorites'
  enabled BOOLEAN DEFAULT TRUE
);

-- User Consents
CREATE TABLE user_consents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  gps_enabled BOOLEAN DEFAULT FALSE,
  gps_schedule JSONB, -- {"monday": "08:00-10:00", ...}
  data_retention_preference TEXT DEFAULT 'delete' CHECK (data_retention_preference IN ('delete', 'anonymize', 'keep')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE detours ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified example - adaptar según necesidades)

-- Profiles: users can read own profile, admins can read all
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Routes: public can read approved routes, creators can CRUD
CREATE POLICY "Approved routes are public" ON routes
  FOR SELECT USING (validation_status = 'approved' AND deleted_at IS NULL);

-- Users can create routes
CREATE POLICY "Users can create routes" ON routes
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own routes
CREATE POLICY "Users can update own routes" ON routes
  FOR UPDATE USING (created_by = auth.uid());

-- Incidents: public can read active, users can create, admins can CRUD
CREATE POLICY "Active incidents are public" ON incidents
  FOR SELECT USING (status = 'active');

-- Reports: users can create, admins can CRUD
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Route Stops: public can read
CREATE POLICY "Route stops are public" ON route_stops
  FOR SELECT USING (TRUE);

-- Location Points: only trip owner can read/write
CREATE POLICY "Trip owner can manage location points" ON location_points
  FOR ALL USING (trip_session_id IN (SELECT id FROM trip_sessions WHERE user_id = auth.uid()));

-- Bus Observations: public can read, users can create during active session
CREATE POLICY "Bus observations are readable" ON bus_observations
  FOR SELECT USING (TRUE);

-- Indexes for performance (removed GiST, using btree instead)
CREATE INDEX idx_routes_code ON routes(code);
CREATE INDEX idx_routes_city ON routes(city);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_routes_validation_status ON routes(validation_status);
-- Removed idx_stops_geo (GiST on double precision caused error)
-- Using bbox filter in application code instead
CREATE INDEX idx_location_points_timestamp ON location_points(timestamp DESC);
CREATE INDEX idx_bus_observations_route ON bus_observations(route_id, observed_at DESC);
CREATE INDEX idx_incidents_route ON incidents(route_id, status);
CREATE INDEX idx_reports_route ON reports(route_id, status);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Comment: Índices de búsqueda por bbox se harán en la aplicación code
-- en lugar de índices GiST en la BD para evitar problemas de tipo