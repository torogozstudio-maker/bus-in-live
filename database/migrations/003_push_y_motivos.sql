-- =============================================================================
-- Migración 003 · motivos de rechazo/revisión + suscripciones Web Push (NO borra datos)
--
-- Úsala si tu base ya existe (creada con el schema.sql de antes del 23/10/2026).
-- schema.sql ya trae estos cambios, pero "CREATE TABLE IF NOT EXISTS" NO agrega columnas a una
-- tabla que ya existe: sin esta migración, rechazar una ruta (rejection_reason) o revisar un
-- reporte con motivo (review_reason) falla con "column ... does not exist".
-- Es repetible: se puede ejecutar más de una vez sin error.
-- =============================================================================

ALTER TABLE routes  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_reason TEXT;

-- Suscripciones Web Push (VAPID): quién puede recibir avisos
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_admin_all" ON push_subscriptions;

CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions FOR DELETE
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "push_subscriptions_admin_all" ON push_subscriptions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
