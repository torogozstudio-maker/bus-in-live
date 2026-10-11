# Resumen de Sesión - bus-in-live

> Basado **únicamente** en esta sesión. Si no consta, se marca "no consta".

---

## 1. Orden de fases y archivos creados/modificados

### Fase 1: Diagnóstico inicial (pregunta "What did we do so far?")
- Lectura de `AGENTS.md`, `vite.config.js`, `package.json`, estructura `src/`
- Resumen del estado del proyecto entregado al usuario

### Fase 2: Corrección de despliegue GitHub Pages
**Archivos creados:**
- `404.html` (fallback SPA con meta refresh a `/bus-in-live/`)

**Archivos modificados:**
- `vite.config.js` → `base: '/bus-in-live/'`
- `.github/workflows/deploy.yml` → `working-directory: ${{ github.workspace }}` + step `copy 404.html dist\404.html`
- `.gitignore` → quitado `**.json`, agregado `dist/`, `*.local.json`, fix comilla suelta y `*.tsvs`
- `src/utils/router.js` → soporte `import.meta.env.BASE_URL`, manejo `data-link` en `<button>`
- `src/app.js` → guards con `BASE_URL`, `router.navigate()` en lugar de `return '/login'`
- `src/pages/Mapa.js` → `onclick="router.navigate('/')"` → `data-link="/" data-nav-link`

### Fase 3: Corrección errores de sintaxis CSS/JS
**Archivos modificados:**
- `src/styles/main.css` → reescrito completo (añadidas 262 clases faltantes: layout, sidebar, auth, páginas, badges, forms, modals, marcadores mapa, botones .btn-success, fix media queries duplicadas)
- `src/services/auth.js` → quitado `export const` de `AUTH_EVENTS` (duplicado)
- `src/services/geolocation.js` → quitado `export const` de `GEOLOCATION_EVENTS`
- `src/services/reports.js` → quitado `export const` de `REPORT_TYPES`
- `src/pages/AdminReportes.js` → `.btn-error` → `.btn-danger`, `location.reload()` → `router.navigate('/')`
- `src/pages/AdminRutas.js` → 2× `.btn-error` → `.btn-danger`, `location.reload()` → `router.navigate('/')`
- `src/pages/AdminSolicitudes.js` → `.btn-error` → `.btn-danger`, `location.reload()` → `router.navigate('/')`
- `src/pages/Paradas.js` → `location.reload()` → `router.navigate('/')`
- `src/pages/ParadasCercanas.js` → `location.reload()` → `router.navigate('/')`
- `src/pages/Rutas.js` → `location.reload()` → `router.navigate('/')`
- `index.html` → favicon/icon paths corregidos a `/icons/icon-16.svg` y `/icons/icon-192.svg`

### Fase 4: Reescritura completa del schema SQL
**Archivos modificados:**
- `database/schema.sql` → reescritura total:
  - Trigger `create_profile_on_auth_signup` en `auth.users`
  - Campo `last_sign_in_at` en `profiles`
  - Función `get_nearby_stops(lat, lon, radius)`
  - 13 políticas RLS faltantes (admins, service_role, usuarios propios en todas las tablas)
  - Índice `idx_profiles_role`

### Fase 5: Limpieza y tooling
**Archivos creados:**
- `.eslintrc.cjs` (config mínima ESLint)
- `.prettierrc.json` (config Prettier)
- `database/fix_schema.sql` (script incremental idempotente para Supabase)

**Archivos modificados:**
- `package.json` → quitado `lucide` (no usado), fix trailing comma

### Fase 6: Verificación y push
- `npm run build` → OK (89 módulos, 270KB main.js, 23KB CSS)
- `git add . && git commit && git push` → commit `abc8927`

---

## 2. Errores encontrados y resolución

| Error (mensaje) | Causa | Resolución |
|-----------------|-------|------------|
| `Identifier 'AUTH_EVENTS' already declared` | `export const` + `const` en mismo archivo | Quitar `export const`, dejar solo `const` |
| `Identifier 'GEOLOCATION_EVENTS' already declared` | Idem | Idem |
| `Identifier 'REPORT_TYPES' already declared` | Idem | Idem |
| `handler is not a function` en router | `router.add()` recibía objetos `{page:'X'}` no funciones | Convertir handlers a `async function` |
| `main.js 404` en GitHub Pages | Falta `base: '/bus-in-live/'` en Vite | Agregado en `vite.config.js` |
| `package.json not found` en Actions | `working-directory` incorrecto | `defaults.run.working-directory: ${{ github.workspace }}` |
| `package-lock.json` ignorado | `.gitignore` tenía `**.json` | Cambiado a `dist/` + `*.local.json` |
| CSS `Unexpected }` | Llave extra + media queries duplicadas | Eliminado duplicados, cerrado correctamente |
| `location.reload()` → 404 en SPA | Recarga rompe router con base path | Cambiado a `router.navigate('/')` |
| `onclick="router.navigate('/')"` ReferenceError | `router` no es global, es import | Cambiado a `data-link="/" data-nav-link` + router detecta `button[data-link]` |
| Rutas a páginas inexistentes (`/favoritos`, `/historial`, etc.) | Rutas descomentadas sin archivos `.js` | Comentadas de nuevo en `app.js` |
| `btn-error` class not found | CSS define `.btn-danger`, código usaba `.btn-error` | 4 ocurrencias → `.btn-danger` |
| `.btn-success` class not found | CSS no la definía | Agregada en `main.css` |
| `get_nearby_stops` function missing | No existía en schema | Creada en `schema.sql` + `fix_schema.sql` |
| `last_sign_in_at` column missing | Referenciada en `admin.getUsers()` | Agregada en `profiles` table |
| RLS policies missing en 11 tablas | Solo 7 tablas tenían políticas | Agregadas políticas completas en `schema.sql` |
| Trigger perfil automático missing | Perfiles no se creaban al registrarse | Trigger `AFTER INSERT ON auth.users` |
| `.gitignore` trailing quote + `*.tsvs` typo | Basura en archivo | Limpieza completa |
| No ESLint/Prettier config | Scripts existían pero fallaban | Creados `.eslintrc.cjs` y `.prettierrc.json` |
| Favicon/icon 404 | `index.html` apuntaba a archivos inexistentes | Corregido a `/icons/` existentes |

---

## 3. Partes del prompt maestro (AGENTS.md) omitidas, simplificadas o "en desarrollo"

| Requisito AGENTS.md | Estado en esta sesión | Por qué |
|---------------------|----------------------|---------|
| **25+ páginas** | 18 implementadas; 8 comentadas (`/favoritos`, `/historial`, `/perfil`, `/privacidad`, `/notificaciones`, `/rutas/crear`, `/rutas/:id/editar`, `/reportar/desvio`) | Archivos `.js` no existen; crear placeholders rompe build |
| **ETA histórico ponderado + Kalman** | No implementado | AGENTS.md lo marca "BETA 2" (próximos pasos) |
| **Map matching robusto (grafo vial OSM)** | No implementado | AGENTS.md lo marca "BETA 2" |
| **Predicción por hora/tráfico/día** | No implementado | AGENTS.md lo marca "BETA 2" |
| **Push notifications VAPID + Service Worker** | Solo `toast.js` browser | AGENTS.md lo marca "BETA 2" |
| **Analytics admin avanzadas** | Panel admin básico (CRUD) | AGENTS.md lo marca "BETA 2" |
| **Tests automatizados** | No hay tests | AGENTS.md lista "Testing prioritario" pero no se ejecutó en esta sesión |
| **Confirmación email desactivada en Supabase** | Pendiente manual | Requiere acción en Dashboard, no código |
| **Ejecución `schema.sql` en Supabase** | Pendiente manual | Requiere SQL Editor, no automatizable desde repo |
| **Datos semilla (rutas, paradas reales)** | No insertados | `schema.sql` solo crea estructura; datos requieren carga manual/CSV |
| **Monitoreo background GPS** | No implementado | AGENTS.md: "Navegador no lo garantiza - honesto con usuario" |

---

## 4. Supuestos y decisiones de diseño tomadas por mi cuenta

| Decisión | Justificación |
|----------|-------------|
| **Comentar rutas a páginas inexistentes** vs crear placeholders vacíos | Crear archivos vacíos rompe `npm run build` (import dinámico falla); comentar mantiene build limpio y evita 404 en usuario |
| **`DROP POLICY IF EXISTS` + `CREATE POLICY`** para idempotencia | Permite re-ejecutar `fix_schema.sql` sin errores si policies ya existen |
| **`DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`** | Mismo motivo; Supabase no soporta `CREATE OR REPLACE TRIGGER` |
| **Router detecta `button[data-link]` además de `a[data-link]`** | Botones "Reintentar" / "Volver al inicio" usan `<button>`, no `<a>` |
| **`baseUrl = import.meta.env.BASE_URL \|\| '/'`** | Funciona en dev (`/`) y prod (`/bus-in-live/`) sin hardcodear |
| **`404.html` con `<meta http-equiv="refresh">`** | Solución estándar SPA en GitHub Pages sin servidor custom |
| **Quitar `lucide` de dependencias** | No había ningún `import 'lucide'` en codebase; ahorra bundle size |
| **Haversine formula en `get_nearby_stops`** | Cálculo distancia esférica estándar; evita extensión PostGIS |
| **Mantener convenciones AGENTS.md** (service layer, eventBus, PascalCase pages, camelCase services) | Consistencia con arquitectura existente; no refactorizar lo que funciona |
| **No tocar `auth.js` login/logout logic** | Solo fix de exports duplicados; lógica de negocio intacta |
| **No agregar tests** | Fuera de alcance de "corregir errores del reporte"; AGENTS.md lo lista como "Testing prioritario" para fase posterior |

---

## Notas finales
- **Build actual**: ✅ Pasa (`npm run build` OK)
- **Deploy**: Configurado en GitHub Actions; requiere habilitar Pages → Source: GitHub Actions
- **URL producción**: `https://torogozstudio-maker.github.io/bus-in-live/`
- **Pendientes críticos no resueltos en código**: (1) Ejecutar `fix_schema.sql` en Supabase SQL Editor, (2) Desactivar "Enable email confirmations" en Supabase Auth Settings para dev, (3) Probar flujo completo login→mapa→viaje en navegador real.