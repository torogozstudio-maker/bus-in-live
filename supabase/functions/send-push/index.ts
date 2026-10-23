// Edge Function: send-push — envío real de Web Push (VAPID) desde Supabase.
//
// Autenticación: header `Authorization: Bearer <PUSH_WEBHOOK_SECRET>` o
// `Bearer <SUPABASE_SERVICE_ROLE_KEY>`. Se despliega con --no-verify-jwt porque
// el secreto compartido NO es un JWT; la validación la hacemos aquí mismo.
//
// Payload aceptado (2 formas):
//   a) Directo:  { title, body, url?, route_id?, category? }
//   b) Webhook:  { type, record }   (Database Webhook de Supabase, tabla incidents)
//
// Filtrado honesto:
//   - route_id  -> solo usuarios que tienen esa ruta en favoritos.
//   - category  -> respeta notification_preferences (fila ausente = activado).
//   - Sin esos campos -> todos los suscritos.
//
// Variables requeridas (supabase secrets set):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';
import webPush from 'npm:web-push@3.6.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const INCIDENT_LABELS = {
  accident: 'Accidente',
  traffic: 'Tráfico intenso',
  breakdown: 'Bus averiado',
  blockage: 'Bloqueo',
  detour: 'Desvío',
  suspended: 'Servicio suspendido',
  other: 'Incidencia'
};

// Database Webhook -> payload legible. Devuelve null si no sabemos mapearlo.
function normalizePayload(payload) {
  if (payload && payload.title) {
    return {
      title: String(payload.title),
      body: payload.body ? String(payload.body) : '',
      url: payload.url ? String(payload.url) : '/',
      routeId: payload.route_id || null,
      category: payload.category || null
    };
  }

  if (payload && payload.record) {
    const record = payload.record;
    if (payload.type === 'incidents') {
      const label = INCIDENT_LABELS[record.type] || 'Incidencia';
      const description = record.description ? String(record.description) : '';
      return {
        title: `Incidencia: ${label}`,
        body: (description || label).slice(0, 140),
        url: record.route_id ? `/rutas/${record.route_id}` : '/mapa',
        routeId: record.route_id || null,
        category: 'incidents'
      };
    }
    if (payload.type === 'route_change_requests') {
      return {
        title: 'Cambio en una de tus rutas',
        body: record.reason ? String(record.reason).slice(0, 140) : 'Se propuso un cambio en una ruta tuya.',
        url: '/admin/solicitudes',
        routeId: record.route_id || null,
        category: 'route_changes'
      };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // --- Autenticación por secreto compartido ---
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!token || (token !== webhookSecret && token !== serviceKey)) {
    return json({ error: 'unauthorized' }, 401);
  }

  // --- VAPID ---
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';
  if (!publicKey || !privateKey) {
    return json({ error: 'VAPID keys not configured', configured: false }, 503);
  }

  const raw = await req.json().catch(() => null);
  const payload = normalizePayload(raw || {});
  if (!payload) return json({ error: 'Unrecognized payload; expected {title,body} or {type,record}' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // --- Destinatarios ---
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth');
  if (subsError) return json({ error: subsError.message }, 500);

  let recipients = subs || [];

  if (payload.routeId) {
    const { data: favs } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('route_id', payload.routeId);
    const users = new Set((favs || []).map((f) => f.user_id));
    recipients = recipients.filter((r) => users.has(r.user_id));
  }

  if (payload.category) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, category, enabled')
      .eq('category', payload.category);
    const disabled = new Set((prefs || []).filter((p) => !p.enabled).map((p) => p.user_id));
    recipients = recipients.filter((r) => !disabled.has(r.user_id));
  }

  if (recipients.length === 0) {
    return json({ sent: 0, total: 0, note: 'No matching subscribers' });
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body || '',
    url: payload.url || '/'
  });

  const results = await Promise.all(
    recipients.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        return { id: sub.id, ok: true };
      } catch (err) {
        const status = err?.statusCode;
        return { id: sub.id, ok: false, expired: status === 404 || status === 410, status };
      }
    })
  );

  // Limpieza: suscripciones que el navegador ya no acepta (404/410).
  const expiredIds = results.filter((r) => r.expired).map((r) => r.id);
  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return json({
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok && !r.expired).length,
    expiredRemoved: expiredIds.length,
    total: recipients.length
  });
});
