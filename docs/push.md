# Push real (Web Push + VAPID) — cómo activarlo

El frontend ya está listo: `src/services/notifications.js` + `public/sw.js` + página
`/notificaciones`. El **envío real** lo hace la Edge Function
`supabase/functions/send-push/index.ts` (aquí vive el backend: usa la clave **privada**
VAPID, que jamás va al navegador).

## 1. Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

Salen dos claves: **public** y **private**.

## 2. Clave pública en el frontend

```env
# .env local (y en Settings > Variables de GitHub Actions si usas CI)
VITE_VAPID_PUBLIC_KEY=<clave pública>
```

Sin esta variable, `/notificaciones` muestra honestamente "este despliegue no tiene
configurada la clave".

## 3. Secretos de la Edge Function

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<clave pública> \
  VAPID_PRIVATE_KEY=<clave privada> \
  VAPID_SUBJECT=mailto:TU_CORREO \
  PUSH_WEBHOOK_SECRET=<cadena aleatoria larga>
```

## 4. Desplegar

```bash
supabase functions deploy send-push --no-verify-jwt
```

`--no-verify-jwt` es necesario porque la autenticación es por secreto propio
(`Authorization: Bearer <PUSH_WEBHOOK_SECRET>`), no por JWT de Supabase.

## 5. Probar

```bash
curl -X POST https://<REF>.supabase.co/functions/v1/send-push \
  -H "Authorization: Bearer <PUSH_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hola","body":"Prueba de bus-in-live","url":"/mapa"}'
```

Respuesta: `{ "sent": N, "expiredRemoved": N, "total": N }`.

## 6. Disparadores automáticos

En **Supabase Dashboard → Database → Webhooks**:

| Webhook | Tabla / evento | Evento | Header |
|---------|----------------|--------|--------|
| incidencias | `incidents` | INSERT | `Authorization: Bearer <PUSH_WEBHOOK_SECRET>` |

La función acepta el formato `{type, record}` de los webhooks de Supabase y lo
convierte en notificación. Para `route_change_requests` o eventos de moderación,
puedes invocarla con `curl` desde tu flujo manual o crear otro webhook con formato
directo `{"title","body","url","route_id"}`.

## Lógica de destinatarios (sin spam)

- `route_id` presente → **solo** quienes tienen esa ruta en **favoritos**.
- `category` presente → respeta `notification_preferences` (sin fila = activado).
- Sin esos campos → todos los suscritos.
- Suscripciones vencidas (404/410) se **eliminan automáticamente**.

## Verificación completa

1. Abrir `/notificaciones` → "Activar notificaciones" (pide permiso al navegador).
2. Hacer el `curl` de prueba.
3. Debe llegar la notificación al navegador aunque la pestaña esté en segundo plano.
