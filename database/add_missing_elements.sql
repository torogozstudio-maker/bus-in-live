-- Script incremental seguro para Supabase SQL Editor
-- Ejecutar cada bloque por separado si da error (eso está bien)

-- ==========================================================--
-- BLOQUE 1: Agregar campo last_sign_in_at a profiles
-- ==========================================================--
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
SELECT '✓ Bloque 1: Campo last_sign_in_at agregado';

-- ==========================================================--
-- BLOQUE 2: Trigger perfil automático al registrarse
-- ==========================================================--
-- Función (si ya existe, se reemplaza)
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (elimina si existe y vuelve a crear)
DROP TRIGGER IF EXISTS create_profile_on_auth_signup ON auth.users;
CREATE TRIGGER create_profile_on_auth_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_on_signup();
SELECT '✓ Bloque 2: Trigger perfil automático creado';

-- ==========================================================--
-- BLOQUE 3: Función get_nearby_stops
-- ==========================================================--
CREATE OR REPLACE FUNCTION get_nearby_stops(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  stop_type TEXT,
  status TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, s.name, s.latitude, s.longitude, s.stop_type, s.status,
    ROUND(
      6371 * acos(
        cos(radians(p_latitude)) * cos(radians(s.latitude)) * 
        cos(radians(s.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * sin(radians(s.latitude))
      ), 
      2
    ) AS distance_km
  FROM stops s
  WHERE s.status = 'active'
  HAVING ROUND(
    6371 * acos(
      cos(radians(p_latitude)) * cos(radians(s.latitude)) * 
      cos(radians(s.longitude) - radians(p_longitude)) + 
      sin(radians(p_latitude)) * sin(radians(s.latitude))
    ), 
    2
  ) <= p_radius
  ORDER BY distance_km ASC;
END;
$$;
SELECT '✓ Bloque 3: Función get_nearby_stops creada';

-- ==========================================================--
-- BLOQUE 4: Políticas RLS (usando DROP + CREATE seguros)
-- ==========================================================--

-- 4.1 Perfiles: admins pueden leer todos
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4.2 Perfiles: service role puede gestionar
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- 4.3 Routes: admins pueden gestionar todo
DROP POLICY IF EXISTS "Admins can manage all routes" ON routes;
CREATE POLICY "Admins can manage all routes" ON routes
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4.4 Incidents: admins pueden gestionar todo
DROP POLICY IF EXISTS "Admins can manage all incidents" ON incidents;
CREATE POLICY "Admins can manage all incidents" ON incidents
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4.5 Reports: admins pueden gestionar todo
DROP POLICY IF EXISTS "Admins can manage all reports" ON reports;
CREATE POLICY "Admins can manage all reports" ON reports
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4.6 Route variants: solo leer las de rutas aprobadas
DROP POLICY IF EXISTS "Route variants for approved routes" ON route_variants;
CREATE POLICY "Route variants for approved routes" ON route_variants
  FOR SELECT USING (
    route_id IN (SELECT id FROM routes WHERE validation_status = 'approved' AND deleted_at IS NULL)
  );

-- 4.7 Favorites: usuarios pueden gestionar las suyas
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (user_id = auth.uid());

-- 4.8 Search history: usuarios pueden gestionar las suyas
DROP POLICY IF EXISTS "Users can manage own search history" ON search_history;
CREATE POLICY "Users can manage own search history" ON search_history
  FOR ALL USING (user_id = auth.uid());

-- 4.9 Notification preferences: usuarios pueden gestionar las suyas
DROP POLICY IF EXISTS "Users can manage own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- 4.10 User consents: usuarios pueden gestionar las suyas
DROP POLICY IF EXISTS "Users can manage own consents" ON user_consents;
CREATE POLICY "Users can manage own consents" ON user_consents
  FOR ALL USING (user_id = auth.uid());

-- 4.11 Route change requests: admins pueden gestionar
DROP POLICY IF EXISTS "Admins can manage route change requests" ON route_change_requests;
CREATE POLICY "Admins can manage route change requests" ON route_change_requests
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4.12 Deletion requests: admins pueden gestionar
DROP POLICY IF EXISTS "Admins can manage deletion requests" ON deletion_requests;
CREATE POLICY "Admins can manage deletion requests" ON deletion_requests
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4.13 Índice en profiles.role
DROP INDEX IF EXISTS idx_profiles_role;
CREATE INDEX idx_profiles_role ON profiles(role);

SELECT '✅ TODO COMPLETADO. Tu schema ahora tiene todos los elementos faltantes.' AS message;