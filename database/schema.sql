-- =============================================================================
-- bus-in-live · esquema de base de datos (PostgreSQL / Supabase)
--
-- Instalación desde cero: pega TODO este archivo en Supabase > SQL Editor y ejecútalo.
-- Si ya tienes una base creada con una versión anterior, usa en su lugar
-- database/migrations/002_security_fixes.sql (no borra datos).
--
-- Parte 1: tablas · Parte 2: funciones, triggers, seguridad (RLS) e índices.
-- =============================================================================

-- ===================== PARTE 1: TABLAS =====================

-- Perfiles (extiende auth.users). Se crean solos con el trigger de la Parte 2.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  nombre TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  type TEXT DEFAULT 'regular' CHECK (type IN ('regular', 'especial')),
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'delay', 'detour', 'temporary_detour', 'suspended', 'out_of_service', 'insufficient_info')),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  city TEXT DEFAULT 'Santa Ana',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS route_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variant_type TEXT,
  direct BOOLEAN DEFAULT FALSE, -- TRUE = directo, FALSE = no directo
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES route_variants(id),
  stop_id UUID REFERENCES stops(id),
  sequence INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_shapes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES route_variants(id),
  geometry JSONB NOT NULL, -- GeoJSON LineString: {"type": "LineString", "coordinates": [[lon, lat], ...]}
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  variant_id UUID REFERENCES route_variants(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  consent BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'))
);

CREATE TABLE IF NOT EXISTS location_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_session_id UUID REFERENCES trip_sessions(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bus_observations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  variant_id UUID REFERENCES route_variants(id),
  type TEXT NOT NULL CHECK (type IN ('accident', 'traffic', 'breakdown', 'blockage', 'detour', 'suspended', 'other')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location JSONB, -- opcional: {"type": "Point", "coordinates": [lon, lat]}
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired')),
  severity_level INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS detours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  original_shape_id UUID REFERENCES route_shapes(id),
  temporary_shape JSONB, -- geometría GeoJSON
  reason TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS route_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  reason TEXT,
  evidence TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  stop_id UUID REFERENCES stops(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, route_id, stop_id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- 'route', 'stop', 'report'
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'route_changes', 'incidents', 'reports', 'eta', 'favorites'
  enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  gps_enabled BOOLEAN DEFAULT FALSE,
  gps_schedule JSONB, -- {"monday": "08:00-10:00", ...}
  data_retention_preference TEXT DEFAULT 'delete' CHECK (data_retention_preference IN ('delete', 'anonymize', 'keep')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== PARTE 2: FUNCIONES, TRIGGERS, SEGURIDAD E ÍNDICES =====================
-- Todo lo de esta parte es idempotente: se puede ejecutar varias veces sin error.

-- ---------- Funciones auxiliares ----------

-- ¿El usuario actual es administrador?
-- SECURITY DEFINER: lee `profiles` saltándose RLS. Es OBLIGATORIO para usarla dentro de
-- políticas: una política de `profiles` que consulte `profiles` provoca
-- "infinite recursion detected in policy".
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Mantiene updated_at al día
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON public.routes;
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Crea el perfil automáticamente cuando alguien se registra.
-- SECURITY DEFINER para poder insertar en profiles aunque el usuario aún no tenga permisos.
-- El rol SIEMPRE nace como 'user' (nunca se toma de los metadatos que controla el usuario).
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, avatar, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_profile_on_auth_signup ON auth.users;
CREATE TRIGGER create_profile_on_auth_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_signup();

-- Copia la fecha del último inicio de sesión al perfil (la usa el panel de administración)
CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_sign_in_at = NEW.last_sign_in_at WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_last_sign_in_on_auth ON auth.users;
CREATE TRIGGER sync_last_sign_in_on_auth
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_sign_in();

-- Perfiles para usuarios que ya existían antes del trigger (si no, sus FK fallarían)
INSERT INTO public.profiles (id, email, nombre, avatar, role, last_sign_in_at)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
       'user', u.last_sign_in_at
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ---------- Paradas cercanas ----------
-- La app llama: rpc('get_nearby_stops', { user_lat, user_lng, radius_meters })
-- y lee `distance` en METROS (ver ParadasCercanas.js).
DROP FUNCTION IF EXISTS public.get_nearby_stops(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE FUNCTION public.get_nearby_stops(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  stop_type TEXT,
  description TEXT,
  status TEXT,
  distance DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT s.id, s.name, s.latitude, s.longitude, s.stop_type, s.description, s.status, d.meters
  FROM public.stops s
  CROSS JOIN LATERAL (
    SELECT ROUND(
      6371000 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(s.latitude))
      )))
    ) AS meters
  ) d
  WHERE s.status = 'active' AND d.meters <= radius_meters
  ORDER BY d.meters
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_stops(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER)
  TO anon, authenticated, service_role;

-- ---------- Seguridad a nivel de fila (RLS) ----------
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

-- Se borran TODAS las políticas del esquema public y se recrean abajo, para que no queden
-- versiones viejas (p. ej. las que causaban recursión). Si agregaste políticas propias
-- desde el panel de Supabase, vuelve a crearlas después. (service_role siempre se salta RLS.)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Profiles: cada quien ve el suyo; admin ve y puede cambiar roles. Nadie inserta/borra desde la app
-- (los perfiles los crea el trigger) y nadie puede cambiarse el rol a sí mismo.
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()));
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  USING (public.is_admin());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Routes: públicas si están aprobadas; el creador ve y edita las suyas mientras están pendientes;
-- admin gestiona todas. Nadie puede crearse una ruta ya aprobada.
CREATE POLICY "routes_select_approved" ON routes FOR SELECT
  USING (validation_status = 'approved' AND deleted_at IS NULL);
CREATE POLICY "routes_select_own" ON routes FOR SELECT
  USING (created_by = (SELECT auth.uid()));
CREATE POLICY "routes_insert_own" ON routes FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()) AND validation_status = 'pending');
CREATE POLICY "routes_update_own_pending" ON routes FOR UPDATE
  USING (created_by = (SELECT auth.uid()) AND validation_status = 'pending')
  WITH CHECK (created_by = (SELECT auth.uid()) AND validation_status = 'pending');
CREATE POLICY "routes_admin_all" ON routes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Variantes, paradas de ruta y trazados: se ven si la ruta es visible para el usuario;
-- se editan si la ruta es suya y sigue pendiente (o si es admin).
CREATE POLICY "route_variants_select" ON route_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_variants.route_id));
CREATE POLICY "route_variants_write_owner" ON route_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_variants.route_id
                 AND r.created_by = (SELECT auth.uid()) AND r.validation_status = 'pending'))
  WITH CHECK (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_variants.route_id
                 AND r.created_by = (SELECT auth.uid()) AND r.validation_status = 'pending'));
CREATE POLICY "route_variants_admin_all" ON route_variants FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "route_stops_select" ON route_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id));
CREATE POLICY "route_stops_write_owner" ON route_stops FOR ALL
  USING (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id
                 AND r.created_by = (SELECT auth.uid()) AND r.validation_status = 'pending'))
  WITH CHECK (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id
                 AND r.created_by = (SELECT auth.uid()) AND r.validation_status = 'pending'));
CREATE POLICY "route_stops_admin_all" ON route_stops FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "route_shapes_select" ON route_shapes FOR SELECT
  USING (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_shapes.route_id));
CREATE POLICY "route_shapes_write_owner" ON route_shapes FOR ALL
  USING (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_shapes.route_id
                 AND r.created_by = (SELECT auth.uid()) AND r.validation_status = 'pending'))
  WITH CHECK (EXISTS (SELECT 1 FROM routes r WHERE r.id = route_shapes.route_id
                 AND r.created_by = (SELECT auth.uid()) AND r.validation_status = 'pending'));
CREATE POLICY "route_shapes_admin_all" ON route_shapes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Stops: todos las ven; cada usuario gestiona las que creó; admin todas.
CREATE POLICY "stops_select_public" ON stops FOR SELECT USING (TRUE);
CREATE POLICY "stops_insert_own" ON stops FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "stops_update_own" ON stops FOR UPDATE
  USING (created_by = (SELECT auth.uid())) WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "stops_delete_own" ON stops FOR DELETE
  USING (created_by = (SELECT auth.uid()));
CREATE POLICY "stops_admin_all" ON stops FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Viajes y puntos GPS: solo su dueño (privacidad de ubicación).
CREATE POLICY "trip_sessions_own" ON trip_sessions FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "location_points_own" ON location_points FOR ALL
  USING (trip_session_id IN (SELECT id FROM trip_sessions WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (trip_session_id IN (SELECT id FROM trip_sessions WHERE user_id = (SELECT auth.uid())));

-- Observaciones de buses: lectura pública; solo se crean desde un viaje propio.
CREATE POLICY "bus_observations_select" ON bus_observations FOR SELECT USING (TRUE);
CREATE POLICY "bus_observations_insert_own" ON bus_observations FOR INSERT
  WITH CHECK (trip_session_id IN (SELECT id FROM trip_sessions WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "bus_observations_admin_all" ON bus_observations FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Incidencias: las activas son públicas; cualquiera registrado puede crear; admin gestiona.
CREATE POLICY "incidents_select_active" ON incidents FOR SELECT USING (status = 'active');
CREATE POLICY "incidents_select_own" ON incidents FOR SELECT
  USING (created_by = (SELECT auth.uid()));
CREATE POLICY "incidents_insert_own" ON incidents FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "incidents_admin_all" ON incidents FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Desvíos: los activos son públicos; solo admin los gestiona.
CREATE POLICY "detours_select_active" ON detours FOR SELECT USING (status = 'active');
CREATE POLICY "detours_admin_all" ON detours FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Reportes: cada usuario ve los suyos; los confirmados son públicos; admin modera todos.
-- (Antes TODOS eran legibles por cualquiera, incluidos descripción y autor.)
CREATE POLICY "reports_select_own" ON reports FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "reports_select_confirmed" ON reports FOR SELECT
  USING (status = 'confirmed');
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');
CREATE POLICY "reports_update_own_pending" ON reports FOR UPDATE
  USING (user_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');
CREATE POLICY "reports_admin_all" ON reports FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Solicitudes de cambio / eliminación: el usuario crea y ve las suyas; admin decide.
CREATE POLICY "route_change_requests_select_own" ON route_change_requests FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "route_change_requests_insert_own" ON route_change_requests FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');
CREATE POLICY "route_change_requests_admin_all" ON route_change_requests FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "deletion_requests_select_own" ON deletion_requests FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "deletion_requests_insert_own" ON deletion_requests FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');
CREATE POLICY "deletion_requests_admin_all" ON deletion_requests FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Datos personales: solo el dueño.
CREATE POLICY "favorites_own" ON favorites FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "search_history_own" ON search_history FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "notification_preferences_own" ON notification_preferences FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "user_consents_own" ON user_consents FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------- Índices ----------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_routes_code ON routes(code);
CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_validation_status ON routes(validation_status);
CREATE INDEX IF NOT EXISTS idx_routes_created_by ON routes(created_by);
CREATE INDEX IF NOT EXISTS idx_route_variants_route ON route_variants(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_shapes_route ON route_shapes(route_id);
CREATE INDEX IF NOT EXISTS idx_stops_lat_lng ON stops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_user ON trip_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_location_points_timestamp ON location_points(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bus_observations_route ON bus_observations(route_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_route ON incidents(route_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_route ON reports(route_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- ---------- Primer administrador ----------
-- Ejecuta esto UNA vez con tu correo (los perfiles nuevos siempre son 'user'):
--   UPDATE profiles SET role = 'admin' WHERE email = 'tu-correo@ejemplo.com';
