# AGENTS.md - bus-in-live

## Propósito del proyecto

Aplicación web colaborativa de transporte público para Santa Ana, El Salvador. Los usuarios comparten su ubicación GPS durante viajes para estimar posición de buses, ETA, detectar incidencias y reportar problemas. Arquitectura preparada para escalar a todo El Salvador.

## Arquitectura general

```
Frontend (Vanilla JS + Vite)
    │
    ├── Router SPA simple (hash/history)
    ├── Event Bus (pub/sub desacoplado)
    ├── Services Layer (abstracción backend)
    │   ├── supabase.js - Cliente Supabase
    │   ├── auth.js - Autenticación + Google OAuth
    │   ├── routes.js - Rutas, variantes, shapes
    │   ├── stops.js - Paradas, cercanas
    │   ├── reports.js - Reportes comunitarios
    │   ├── incidents.js - Incidencias activas
    │   ├── eta.js - Cálculo ETA, frecuencia, confianza
    │   ├── geolocation.js - GPS navegador
    │   ├── tripSession.js - Sesiones "estoy viajando"
    │   ├── admin.js - Panel administración
    │   └── toast.js - Notificaciones
    │
    ├── Components (Header, BottomNav, Sidebar)
    ├── Pages (25+ páginas)
    └── Styles (CSS variables + componentes)
```

**Backend**: Supabase (PostgreSQL + Auth + Realtime + RLS + Storage)
**Mapas**: Leaflet + OpenStreetMap (abstracción MapProvider para migración futura)

## Reglas del proyecto (CRÍTICAS)

### ❌ PROHIBIDO
- Inventar datos falsos (buses, rutas, ETA, horarios, velocidades, accidentes)
- Mostrar "Normal" cuando no hay datos → usar "Información insuficiente"
- Hardcodear `city = "Santa Ana"` en lógica - usar estructura `regions/cities/routes`
- Confiar en frontend para seguridad (RLS obligatorio en BD)
- Acoplar todo a Supabase - usar capa de servicios
- Next.js, Redux, frameworks pesados sin justificación real
- Simular funciones (botones que no hacen nada)
- Microservicios, K8s, colas complejas, IA innecesaria

### ✅ OBLIGATORIO
- Mostrar confianza (Alta/Media/Baja/Insuficiente) en cada estimación
- GPS solo con consentimiento explícito + botón "Dejar de compartir" visible
- Soft delete en rutas (deleted_at, no borrado físico)
- Versionado de cambios en rutas (route_change_requests)
- Separar: usuario esperando ≠ usuario viajando (GPS no = bus)
- ETA con advertencia: "El bus puede llegar antes o después. Llegue 5 min antes"
- Mobile-first responsive (breakpoints: 640, 768, 1024)
- Modo oscuro/claro con CSS variables
- Accesibilidad: labels, contraste, focus-visible, aria-labels

## Convenciones de código

### Nomenclatura
- Archivos: PascalCase para páginas/componentes (`RutaDetalle.js`), camelCase para servicios (`routeService.js`)
- Variables/funciones: camelCase
- Constantes: UPPER_SNAKE_CASE
- CSS: BEM simplificado (`.card`, `.card-header`, `.btn-primary`)

### Estructura de servicios
```javascript
// Cada servicio exporta objeto con métodos async
export const routeService = {
  async getRoutes(filters) { ... },
  async getRouteById(id) { ... },
  async createRoute(data) { ... }
  // Retornar siempre { data, error }
}
```

### Eventos (eventBus)
```javascript
// Nombrado: domain:action
eventBus.emit('trip:started', session)
eventBus.on('geolocation:position', handler)
```

### Páginas
```javascript
// Exportar función renderPage(container, route)
export async function renderPage(container, route) {
  // route: { pathname, params, query }
  container.innerHTML = `...`
  attachListeners()
  await loadData()
}
```

## Comandos

```bash
npm run dev      # Dev server (localhost:3000)
npm run build    # Build producción → dist/
npm run preview  # Preview build
npm run lint     # ESLint
npm run format   # Prettier
```

## Estructura de base de datos

Ver `database/schema.sql` para DDL completo con:
- Tablas principales + índices
- RLS policies (Row Level Security)
- Funciones RPC (get_nearby_stops)
- Triggers (updated_at, perfiles auto-creados)

## Decisiones técnicas documentadas

| Decisión | Justificación |
|----------|---------------|
| Vanilla JS + Vite | Simple, sin dependencias pesadas, compatible con OpenCode |
| Supabase | PostgreSQL real + Auth + RLS + Realtime en uno |
| Leaflet + OSM | Gratis, sin API key, migrable via MapProvider |
| Router propio | 50 líneas, sin dependencias, control total |
| CSS Variables | Temas dinámicos, modo oscuro nativo |
| Service Layer | Migración futura a Firebase/PostgreSQL propio |
| No tracking background | Navegador no lo garantiza - honesto con usuario |

## Seguridad

- **RLS en todas las tablas** - usuario solo ve/modifica lo suyo
- **Roles en BD** - `role` en profiles, admin asignado solo via BD
- **Validación en backend** - nunca confiar en frontend
- **Sanitización** - escape HTML en datos de usuario
- **Rate limiting** - configurar en Supabase (auth, database)
- **Secrets en .env** - nunca en código ni repo

## Flujo de trabajo con OpenCode

1. **ANALIZA** - Entender código existente antes de modificar
2. **PREGUNTA SOLO LO NECESARIO** - No bloquear por decisiones menores
3. **PROPÓN ARQUITECTURA** - Documentar decisiones en código/comentarios
4. **IMPLEMENTA LA BASE** - Servicios → Componentes → Páginas
5. **IMPLEMENTA FUNCIONALIDADES** - Una a la vez, probando
6. **PRUEBA** - Casos edge: GPS off, sin red, sin datos, usuario no auth
7. **REVISA SEGURIDAD/PRIVACIDAD** - RLS, consentimiento, minimización
8. **REVISA RESPONSIVE** - Mobile, tablet, desktop
9. **REVISA CALIDAD** - Lint, format, tipos
10. **EXPLICA** - Qué funciona, qué no, qué falta

## Testing prioritario

- Auth: login, register, OAuth, password reset, session persist
- Permisos: RLS, admin vs user, soft delete
- Geo: distance, speed, position-on-route, invalid GPS
- ETA: cálculo, confidence, historical fallback
- Filtros: rutas, paradas, estados
- CRUD rutas: create, edit, versionado, delete request
- Reportes: create, duplicate check, moderation
- Roles: user cannot access admin, cannot self-promote
- Edge: GPS denied, inaccurate, offline, no data, conflicting reports

## Archivos clave a conocer

| Archivo | Qué hace |
|---------|----------|
| `src/main.js` | Bootstrap: Supabase, Auth, App, Router |
| `src/app.js` | Layout, routing, guards, theme, layout listeners |
| `src/services/supabase.js` | Cliente Supabase singleton |
| `src/services/auth.js` | Auth state, login, register, OAuth, profile |
| `src/services/eta.js` | Haversine, speed, map-matching, ETA, confidence |
| `src/services/tripSession.js` | Start/end trip, buffer positions, flush to DB |
| `src/utils/router.js` | SPA router con guards y params |
| `src/styles/variables.css` | Design system (colores, spacing, typography) |
| `database/schema.sql` | DDL completo + RLS + RPC + triggers |

## Variables de entorno

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Limitaciones actuales (BETA 1)

- ETA básico (velocidad actual + distancia, sin histórico ponderado)
- Map matching simple (distancia punto-línea, sin grafo vial)
- Frecuencia: mediana de intervalos en terminal (mín 3 obs)
- Confianza: heurística simple (cantidad, recencia, precisión)
- No hay predicción por hora/tráfico/día (BETA 2)
- Notificaciones push: solo navegador (Service Worker básico)
- Admin: UI básica, sin analytics avanzadas

## Próximos pasos (BETA 2)

1. Map matching robusto (proyección a grafo vial OSM)
2. ETA histórico ponderado (ventanas temporales, percentiles)
3. Detección automática anomalías (saltos GPS, velocidad imposible)
4. Combinación observaciones múltiples (Kalman filter simple)
5. Predicción por segmento + hora + día
6. Push notifications confiables (VAPID + Service Worker)
7. Analytics admin (cobertura, precisión ETA, usuarios activos)