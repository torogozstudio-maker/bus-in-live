-- 004_route_shape_contributions.sql
-- Genera o amplía el trazado (route_shapes) de una ruta a partir de los puntos
-- GPS de un viaje finalizado. Conserva los trazados existentes: si ya hay uno,
-- añade el nuevo tramo como MultiLineString y crea una nueva versión (la
-- anterior queda inactiva, nunca se borra).
--
-- Ejecutar en Supabase → SQL Editor (idempotente).

ALTER TABLE route_shapes
  ADD COLUMN IF NOT EXISTS source_session_id UUID REFERENCES trip_sessions(id) ON DELETE SET NULL;

ALTER TABLE route_shapes
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Un viaje aporta como máximo un trazado.
CREATE UNIQUE INDEX IF NOT EXISTS uq_route_shapes_source_session
  ON route_shapes(source_session_id)
  WHERE source_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_route_shapes_route_variant_active
  ON route_shapes(route_id, variant_id, active);

CREATE OR REPLACE FUNCTION public.contribute_route_shape(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session RECORD;
  v_point RECORD;
  v_new_coords JSONB := '[]'::jsonb;
  v_point_count INTEGER := 0;
  v_distance_m DOUBLE PRECISION := 0;
  v_segment_m DOUBLE PRECISION;
  v_prev_lat DOUBLE PRECISION;
  v_prev_lng DOUBLE PRECISION;
  v_existing RECORD;
  v_merged JSONB;
  v_geom JSONB;
  v_new_id UUID;
  v_version INTEGER;
  -- Umbrales para no publicar recorridos incompletos o con ruido GPS.
  c_min_points CONSTANT INTEGER := 6;
  c_min_distance_m CONSTANT DOUBLE PRECISION := 80;
  c_max_accuracy_m CONSTANT DOUBLE PRECISION := 50;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_session FROM trip_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión de viaje no encontrada';
  END IF;
  IF v_session.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'No autorizado para esta sesión' USING ERRCODE = '42501';
  END IF;
  IF v_session.route_id IS NULL THEN
    RAISE EXCEPTION 'La sesión no tiene una ruta asociada';
  END IF;
  IF v_session.ended_at IS NULL THEN
    RAISE EXCEPTION 'El viaje debe estar finalizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM routes
    WHERE id = v_session.route_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'La ruta no está disponible';
  END IF;

  -- Evita contribuciones duplicadas para el mismo viaje.
  IF EXISTS (SELECT 1 FROM route_shapes WHERE source_session_id = p_session_id) THEN
    RETURN jsonb_build_object('status', 'exists');
  END IF;

  FOR v_point IN
    SELECT latitude, longitude
    FROM location_points
    WHERE trip_session_id = p_session_id
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND (accuracy IS NULL OR accuracy <= c_max_accuracy_m)
    ORDER BY timestamp
  LOOP
    IF v_prev_lat IS NOT NULL THEN
      v_segment_m := 2 * 6371000 * asin(sqrt(
        power(sin(radians((v_point.latitude - v_prev_lat) / 2)), 2) +
        cos(radians(v_prev_lat)) * cos(radians(v_point.latitude)) *
        power(sin(radians((v_point.longitude - v_prev_lng) / 2)), 2)
      ));

      -- Descarta micro-saltos por ruido GPS.
      IF v_segment_m < 2 THEN
        CONTINUE;
      END IF;
      v_distance_m := v_distance_m + v_segment_m;
    END IF;

    v_new_coords := v_new_coords || jsonb_build_array(
      jsonb_build_array(v_point.longitude, v_point.latitude)
    );
    v_point_count := v_point_count + 1;
    v_prev_lat := v_point.latitude;
    v_prev_lng := v_point.longitude;
  END LOOP;

  IF v_point_count < c_min_points THEN
    RETURN jsonb_build_object('status', 'insufficient_points', 'points', v_point_count);
  END IF;
  IF v_distance_m < c_min_distance_m THEN
    RETURN jsonb_build_object('status', 'insufficient_distance', 'meters', round(v_distance_m));
  END IF;

  SELECT * INTO v_existing
  FROM route_shapes
  WHERE route_id = v_session.route_id
    AND variant_id IS NOT DISTINCT FROM v_session.variant_id
    AND active = TRUE
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_geom := jsonb_build_object('type', 'LineString', 'coordinates', v_new_coords);

    INSERT INTO route_shapes (
      route_id, variant_id, geometry, version, active, source_session_id, source
    ) VALUES (
      v_session.route_id, v_session.variant_id, v_geom, 1, TRUE, p_session_id, 'gps'
    )
    RETURNING id, version INTO v_new_id, v_version;

    RETURN jsonb_build_object(
      'status', 'created',
      'shape_id', v_new_id,
      'version', v_version,
      'points', v_point_count,
      'meters', round(v_distance_m)
    );
  END IF;

  -- Conserva el trazado existente y añade el nuevo tramo (dos usuarios pueden
  -- cubrir paradas distintas).
  IF v_existing.geometry->>'type' = 'MultiLineString' THEN
    v_merged := v_existing.geometry->'coordinates' || jsonb_build_array(v_new_coords);
  ELSIF v_existing.geometry->>'type' = 'LineString' THEN
    v_merged := jsonb_build_array(v_existing.geometry->'coordinates', v_new_coords);
  ELSE
    v_merged := jsonb_build_array(v_new_coords);
  END IF;

  v_geom := jsonb_build_object('type', 'MultiLineString', 'coordinates', v_merged);

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM route_shapes
  WHERE route_id = v_session.route_id
    AND variant_id IS NOT DISTINCT FROM v_session.variant_id;

  UPDATE route_shapes SET active = FALSE WHERE id = v_existing.id;

  INSERT INTO route_shapes (
    route_id, variant_id, geometry, version, active, source_session_id, source
  ) VALUES (
    v_session.route_id, v_session.variant_id, v_geom, v_version, TRUE, p_session_id, 'gps'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'status', 'merged',
    'shape_id', v_new_id,
    'version', v_version,
    'points', v_point_count,
    'meters', round(v_distance_m)
  );
END;
$$;

COMMENT ON FUNCTION public.contribute_route_shape(UUID) IS
  'Crea o amplía el trazado de una ruta usando los puntos GPS de un viaje finalizado del propio usuario.';

REVOKE ALL ON FUNCTION public.contribute_route_shape(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contribute_route_shape(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.contribute_route_shape(UUID) TO authenticated;
