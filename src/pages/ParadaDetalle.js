import { stopService } from '../services/stops.js';
import { routeService } from '../services/routes.js';
import { etaService } from '../services/eta.js';
import { favoriteService } from '../services/favorites.js';
import { geolocationService } from '../services/geolocation.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container, route) {
  const stopId = route.params.id;

  container.innerHTML = `
    <div class="page-container">
      <div id="stop-detail-content" class="loading-page">
        <div class="loading-state"><div class="loading-spinner"></div></div>
      </div>
    </div>
  `;

  await loadStopDetail(stopId);
}

async function loadStopDetail(stopId) {
  const content = document.getElementById('stop-detail-content');

  try {
    const { data: stop, error } = await stopService.getStopById(stopId);
    if (error || !stop) throw new Error('Parada no encontrada');

    const isFav = await favoriteService.isFavorite(null, stopId);
    const userPos = geolocationService.getLastPosition();
    let distance = null;

    if (userPos && stop.latitude && stop.longitude) {
      distance = calculateDistance(userPos.latitude, userPos.longitude, stop.latitude, stop.longitude);
    }

    const routes = stop.route_stops?.map(rs => rs.routes).filter(Boolean) || [];
    const uniqueRoutes = [...new Map(routes.map(r => [r.id, r])).values()];

    content.innerHTML = renderStopDetail(stop, uniqueRoutes, distance, isFav);
    attachStopDetailListeners(stopId, stop);

  } catch (error) {
    console.error('Error loading stop detail:', error);
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
        <h2 class="empty-state-title">Parada no encontrada</h2>
        <a href="/paradas" class="btn btn-primary" data-link>Volver a paradas</a>
      </div>
    `;
  }
}

function renderStopDetail(stop, routes, distance, isFavorite) {
  return `
    <header class="detail-header">
      <div class="container">
        <div class="detail-header-content">
          <div>
            <h1>${stop.name}</h1>
            <p class="detail-meta">
              <span class="badge badge-${getStopBadgeClass(stop.stop_type)}">${getStopTypeLabel(stop.stop_type)}</span>
              ${distance ? `<span class="distance-badge">A ${formatDistance(distance)}</span>` : ''}
            </p>
          </div>
          <button class="btn btn-secondary btn-icon" id="favorite-stop-btn" aria-label="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${isFavorite ? 'var(--primary)' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
        </div>

        <div class="stop-coords-full">
          <span>${stop.latitude?.toFixed(6)}, ${stop.longitude?.toFixed(6)}</span>
          <button class="btn btn-ghost btn-sm" id="copy-coords-btn">Copiar coordenadas</button>
        </div>
      </div>
    </header>

    <div class="container" style="padding-top: 24px; padding-bottom: 24px;">
      <div class="detail-grid">
        <section class="detail-main">
          <div class="card" id="stop-map-section" style="height: 250px; overflow: hidden;">
            <div id="stop-map" class="map-container" style="height: 100%;"></div>
          </div>

          <div class="card" style="margin-top: 16px;">
            <div class="card-header">
              <h3>Rutas que pasan por aquí</h3>
            </div>
            <div class="card-body" style="padding: 0;">
              ${renderRoutesList(routes)}
            </div>
          </div>

          ${stop.description ? `
            <div class="card" style="margin-top: 16px;">
              <div class="card-header"><h3>Descripción</h3></div>
              <div class="card-body"><p>${stop.description}</p></div>
            </div>
          ` : ''}
        </section>

        <aside class="detail-sidebar">
          <div class="card">
            <div class="card-header"><h3>Acciones</h3></div>
            <div class="card-body">
              <a href="/mapa?stop=${stop.id}" class="btn btn-primary btn-full" data-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                Ver en mapa
              </a>
              <a href="/reportar?stop=${stop.id}" class="btn btn-secondary btn-full" data-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Reportar problema en esta parada
              </a>
              <button class="btn btn-secondary btn-full" id="nearby-stops-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Paradas cercanas
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderRoutesList(routes) {
  if (!routes.length) {
    return '<p class="empty-state-text" style="padding: 16px; text-align: center;">No hay rutas asignadas a esta parada</p>';
  }

  return routes.map(r => `
    <a href="/rutas/${r.id}" class="route-list-item" data-link>
      <span class="route-badge" style="background: ${getRouteColor(r.code)}">${r.code}</span>
      <div class="route-info">
        <h4>${r.name}</h4>
        <p>${r.origin} → ${r.destination}</p>
      </div>
      <span class="badge badge-${r.type === 'especial' ? 'warning' : 'info'}">${r.type === 'especial' ? 'Especial' : 'Regular'}</span>
    </a>
  `).join('');
}

function attachStopDetailListeners(stopId, stop) {
  document.getElementById('favorite-stop-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('favorite-stop-btn');
    const isFav = await favoriteService.isFavorite(null, stopId);
    if (isFav) {
      await favoriteService.removeFavorite(null, stopId);
      btn.querySelector('svg').setAttribute('fill', 'none');
      toastService.success('Eliminado de favoritos');
    } else {
      await favoriteService.addFavorite({ stop_id: stopId });
      btn.querySelector('svg').setAttribute('fill', 'var(--primary)');
      toastService.success('Agregado a favoritos');
    }
  });

  document.getElementById('copy-coords-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(`${stop.latitude}, ${stop.longitude}`);
    toastService.success('Coordenadas copiadas');
  });

  document.getElementById('nearby-stops-btn')?.addEventListener('click', () => {
    router.navigate('/paradas-cercanas');
  });

  initStopMap(stop);
}

async function initStopMap(stop) {
  const L = (await import('leaflet')).default;
  const mapEl = document.getElementById('stop-map');
  if (!mapEl || !stop.latitude || !stop.longitude) return;

  if (mapEl._leaflet_map) mapEl._leaflet_map.remove();

  const map = L.map(mapEl, { zoomControl: false, attributionControl: false });
  mapEl._leaflet_map = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  L.marker([stop.latitude, stop.longitude], {
    icon: L.divIcon({
      className: 'custom-marker custom-marker-stop',
      html: '<div style="background: #2563EB; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  }).addTo(map);

  map.setView([stop.latitude, stop.longitude], 16);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getStopTypeLabel(type) {
  const labels = { normal: 'Normal', terminal: 'Terminal', start: 'Inicio', end: 'Fin', intermediate: 'Intermedia' };
  return labels[type] || type;
}

function getStopBadgeClass(type) {
  const classes = { normal: 'info', terminal: 'success', start: 'info', end: 'error', intermediate: 'muted' };
  return classes[type] || 'info';
}

function getRouteColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}