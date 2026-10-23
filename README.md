# bus-in-live

Aplicación web colaborativa de transporte público para Santa Ana, El Salvador. Los usuarios comparten su ubicación GPS durante sus viajes para ayudar a estimar la posición de los buses, tiempos de llegada (ETA) y detectar incidencias.

## Características principales

- **Mapa interactivo** con Leaflet + OpenStreetMap
- **Rutas y variantes** (directo/no directo) con paradas
- **Seguimiento GPS colaborativo** - usuarios comparten ubicación al viajar
- **ETA estimado** basado en observaciones reales + datos históricos
- **Reportes comunitarios** - accidentes, tráfico, buses averiados, desviaciones, etc.
- **Incidencias en tiempo real** con expiración automática
- **Panel de administración** para moderar rutas, reportes e incidencias
- **Favoritos, historial, notificaciones**
- **PWA** - instalable en móvil
- **Modo oscuro/claro**
- **Totalmente responsive** (móvil, tablet, desktop)

## Arquitectura

```
src/
├── main.js                 # Punto de entrada
├── app.js                  # Inicialización de la app, routing, layout
├── services/               # Capa de servicios (backend abstraction)
│   ├── supabase.js         # Cliente Supabase
│   ├── auth.js             # Autenticación (email/password + Google OAuth)
│   ├── routes.js           # Rutas, variantes, shapes
│   ├── stops.js            # Paradas, cercanas, en ruta
│   ├── reports.js          # Reportes comunitarios
│   ├── incidents.js        # Incidencias activas
│   ├── favorites.js        # Favoritos (rutas/paradas)
│   ├── eta.js              # Cálculo ETA, frecuencia, confianza
│   ├── geolocation.js      # GPS del navegador
│   ├── tripSession.js      # Sesiones de viaje (compartir ubicación)
│   ├── admin.js            # Panel de administración
│   └── toast.js            # Notificaciones toast
├── components/             # Componentes UI reutilizables
│   ├── Header.js           # Barra superior (desktop)
│   ├── BottomNav.js        # Navegación inferior (móvil)
│   └── Sidebar.js          # Menú lateral (desktop)
├── pages/                  # Páginas de la aplicación
│   ├── Home.js             # Dashboard principal
│   ├── Login.js            # Inicio de sesión
│   ├── Register.js         # Registro
│   ├── ResetPassword.js    # Recuperar contraseña
│   ├── AuthCallback.js     # Callback OAuth
│   ├── Mapa.js             # Mapa principal con capas
│   ├── Rutas.js            # Listado de rutas
│   ├── RutaDetalle.js      # Detalle de ruta + buses observados
│   ├── Paradas.js          # Listado de paradas
│   ├── ParadaDetalle.js    # Detalle de parada + rutas
│   ├── ParadasCercanas.js  # Paradas cerca del usuario
│   ├── Viajar.js           # "Estoy viajando" - compartir GPS
│   ├── Reportar.js         # Reportar problema
│   ├── AdminDashboard.js   # Dashboard admin
│   ├── AdminRutas.js       # Gestión de rutas
│   ├── AdminReportes.js    # Moderación de reportes
│   ├── AdminIncidencias.js # Gestión de incidencias
│   └── AdminSolicitudes.js # Solicitudes de cambios/eliminación
├── utils/                  # Utilidades
│   ├── router.js           # Router SPA simple
│   └── eventBus.js         # Bus de eventos
└── styles/                 # CSS
    ├── variables.css       # Variables CSS (temas, spacing, colors)
    └── main.css            # Estilos base + componentes
```

## Stack tecnológico

- **Frontend**: Vanilla JS (ES Modules), Vite
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Mapas**: Leaflet + OpenStreetMap
- **Iconos**: Lucide (SVG inline)
- **Fuente**: Inter (Google Fonts)
- **PWA**: Service Worker nativo + manifest

## Instalación

```bash
# Clonar repositorio
cd bus-in-live

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

## Configuración de Supabase

### 1. Crear proyecto en Supabase

Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto.

### 2. Ejecutar migraciones SQL

Copia y ejecuta el contenido de `database/schema.sql` en el SQL Editor de Supabase.

### 3. Configurar autenticación

En Authentication > Providers:
- Habilitar **Email** (con confirmación de email)
- Habilitar **Google** (añadir Client ID/Secret de Google Cloud Console)
- Configurar **Redirect URLs**: `https://tu-dominio.com/auth/callback`

### 4. Configurar RLS

Las políticas RLS ya están incluidas en `schema.sql`. Verifica que estén activadas en Authentication > Policies.

### 5. Obtener credenciales

En Settings > API:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 6. (Opcional) Push notifications

Requiere generar claves VAPID y desplegar la Edge Function `send-push`.
Pasos completos en [`docs/push.md`](docs/push.md).

## Base de datos (Resumen de tablas)

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario (extiende auth.users) |
| `routes` | Rutas de transporte |
| `route_variants` | Variantes (directo/no directo) |
| `stops` | Paradas |
| `route_stops` | Relación ruta-parada (secuencia, dirección) |
| `route_shapes` | Geometrías GeoJSON de rutas |
| `trip_sessions` | Sesiones de viaje (usuario compartiendo GPS) |
| `location_points` | Puntos GPS raw de cada sesión |
| `bus_observations` | Observaciones procesadas (posición en ruta, velocidad, confianza) |
| `incidents` | Incidencias activas (accidentes, tráfico, etc.) |
| `detours` | Desvíos temporales de rutas |
| `reports` | Reportes comunitarios |
| `route_change_requests` | Solicitudes de modificación de rutas |
| `deletion_requests` | Solicitudes de eliminación de rutas |
| `favorites` | Favoritos de usuario |
| `search_history` | Historial de búsquedas |
| `notification_preferences` | Preferencias de notificaciones |
| `user_consents` | Consentimientos GPS/privacidad |
| `push_subscriptions` | Suscripciones Web Push (VAPID) |

## Despliegue

### Vercel / Netlify / Cloudflare Pages

1. Conecta tu repositorio
2. Build command: `npm run build`
3. Output directory: `dist`
4. Añade variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

### HTTPS obligatorio

La geolocalización **requiere contexto seguro (HTTPS)**. No funcionará en `localhost` HTTP sin configuración especial, pero sí en `https://localhost` con certificado válido o en cualquier dominio HTTPS.

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # ESLint
npm run format   # Prettier
npm test         # Tests unitarios (Vitest)
```

## Principios de diseño

1. **Datos reales > Confiabilidad > Privacidad > Claridad > Estética > Complejidad**
2. **No inventar datos** - mostrar "Sin información" antes que valores falsos
3. **Transparencia** - indicar fuente y confianza de cada dato
4. **Privacidad by design** - minimización de datos, consentimiento explícito
5. **Comunidad como fuente** - arquitectura preparada para escalar sin datos iniciales
6. **Beta incremental** - BETA 1 funcional → BETA 2 predicción → BETA 3 escala

## Limitaciones conocidas

- Dependencia de señal GPS del navegador (precisión variable)
- No hay tracking en background confiable en web (requiere PWA + permisos)
- ETA es estimación, no garantía
- Requiere masa crítica de usuarios para datos confiables
- Limitaciones de OpenStreetMap (rate limiting, sin SLA)

## Licencia

MIT - Ver archivo LICENSE para detalles.

## Contribuir

1. Fork del repo
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Contacto

Proyecto comunitario para Santa Ana, El Salvador.