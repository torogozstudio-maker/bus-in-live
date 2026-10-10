import { stopService } from '../services/stops.js';
import { geolocationService, GEOLOCATION_EVENTS } from '../services/geolocation.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { eventBus } from '../utils/eventBus.js';

let userLocation = null;
let nearbyStops = [];
let radius = 500;
let watchId = null;

export async function renderPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Paradas cercanas</h1>
        <p class="page-subtitle">Encuentra paradas cerca de tu ubicación</p>
      </header>

      <div class="nearby-controls card" style="margin-bottom: 16px;">
        <div class="control-group">
          <label for="radius-select" class="form-label">Radio de búsqueda</label>
          <select id="radius-select" class="form-input form-select">
            <option value="100">100 m</option>
            <option value="250">250 m</option>
            <option value="500" selected>500 m</option>
            <option value="1000">1 km</option>
          </select>
        </div>
        <div class="control-group">
          <button class="btn btn-primary btn-full" id="refresh-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Actualizar
          </button>
        </div>
      </div>

      <div id="location-status" class="location-status card" style="margin-bottom: 16px; display: none;">
        <div class="status-content">
          <div class="status-icon loading"></div>
          <div class="status-text">
            <strong>Obteniendo tu ubicación...</strong>
            <span>Permite el acceso a tu ubicación para encontrar paradas cercanas</span>
          </div>
        </div>
      </div>

      <div id="gps-disabled" class="alert alert-warning" style="margin-bottom: 16px; display: none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <div>
          <strong>Ubicación desactivada</strong>
          <p>Activa el GPS en la configuración de tu navegador para usar esta función.</p>
        </div>
        <button class="btn btn-secondary btn-sm" id="request-permission-btn">Solicitar permiso</button>
      </div>

      <div id="stops-list" class="nearby-stops-list">
        <div class="loading-state" style="padding: 32px; text-align: center;">
          <div class="loading-spinner"></div>
          <p>Buscando paradas cercanas...</p>
        </div>
      </div>

      <div id="empty-state" class="empty-state" style="display: none;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <h2 class="empty-state-title">No hay paradas cercanas</h2>
        <p class="empty-state-text">Intenta aumentar el radio de búsqueda o mueve a otra zona.</p>
      </div>
    </div>
  `;

  attachListeners();
  initializeLocation();
}

function attachListeners() {
  const radiusSelect = document.getElementById('radius-select');
  const refreshBtn = document.getElementById('refresh-btn');
  const requestPermBtn = document.getElementById('request-permission-btn');

  radiusSelect.addEventListener('change', (e) => {
    radius = parseInt(e.target.value);
    if (userLocation) {
      searchNearbyStops();
    }
  });

  refreshBtn.addEventListener('click', () => {
    if (userLocation) {
      searchNearbyStops();
    } else {
      initializeLocation();
    }
  });

  requestPermBtn.addEventListener('click', async () => {
    try {
      await geolocationService.requestPermission();
      initializeLocation();
    } catch (error) {
      toastService.error('No se pudo obtener permiso de ubicación');
    }
  });

  eventBus.on(GEOLOCATION_EVENTS.POSITION, (position) => {
    userLocation = position;
    updateLocationStatus(position);
    searchNearbyStops();
  });

  eventBus.on(GEOLOCATION_EVENTS.ERROR, (error) => {
    showLocationError(error.message);
  });

  eventBus.on(GEOLOCATION_EVENTS.PERMISSION_CHANGED, (state) => {
    if (state === 'granted' && !userLocation) {
      initializeLocation();
    } else if (state === 'denied') {
      showLocationError('Permiso de ubicación denegado');
    }
  });
}

async function initializeLocation() {
  const statusEl = document.getElementById('location-status');
  const gpsDisabledEl = document.getElementById('gps-disabled');
  const stopsList = document.getElementById('stops-list');
  const emptyState = document.getElementById('empty-state');

  statusEl.style.display = 'flex';
  gpsDisabledEl.style.display = 'none';
  stopsList.innerHTML = '';
  emptyState.style.display = 'none';

  const permission = await geolocationService.requestPermission();

  if (permission === 'granted') {
    try {
      const position = await geolocationService.getCurrentPosition({ timeout: 10000 });
      userLocation = position;
      updateLocationStatus(position);
      await searchNearbyStops();
    } catch (error) {
      showLocationError('No se pudo obtener tu ubicación: ' + error.message);
    }
  } else {
    showLocationError('Permiso de ubicación denegado. Actívalo en la configuración del navegador.');
  }
}

function updateLocationStatus(position) {
  const statusEl = document.getElementById('location-status');
  const accuracy = position.accuracy;

  statusEl.innerHTML = `
    <div class="status-content">
      <div class="status-icon success"></div>
      <div class="status-text">
        <strong>Ubicación obtenida</strong>
        <span>Precisión: ~${Math.round(accuracy)} m • ${new Date(position.timestamp).toLocaleTimeString()}</span>
      </div>
      <span class="badge badge-${accuracy <= 20 ? 'success' : accuracy <= 50 ? 'warning' : 'error'}">${accuracy <= 20 ? 'Alta precisión' : accuracy <= 50 ? 'Precisión media' : 'Baja precisión'}</span>
    </div>
  `;
}

function showLocationError(message) {
  const statusEl = document.getElementById('location-status');
  const gpsDisabledEl = document.getElementById('gps-disabled');
  const stopsList = document.getElementById('stops-list');
  const emptyState = document.getElementById('empty-state');

  statusEl.style.display = 'none';
  gpsDisabledEl.style.display = 'flex';
  gpsDisabledEl.querySelector('p').textContent = message;
  stopsList.innerHTML = '';
  emptyState.style.display = 'block';
}

async function searchNearbyStops() {
  if (!userLocation) return;

  const stopsList = document.getElementById('stops-list');
  const emptyState = document.getElementById('empty-state');

  stopsList.innerHTML = `
    <div class="loading-state" style="padding: 32px; text-align: center;">
      <div class="loading-spinner"></div>
      <p>Buscando paradas en un radio de ${radius} m...</p>
    </div>
  `;
  emptyState.style.display = 'none';

  try {
    const { data: stops, error } = await stopService.getNearbyStops(
      userLocation.latitude,
      userLocation.longitude,
      radius
    );

    if (error) throw error;

    nearbyStops = stops || [];

    if (!nearbyStops.length) {
      stopsList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    stopsList.innerHTML = nearbyStops.map(stop => renderNearbyStop(stop)).join('');

    stopsList.querySelectorAll('.nearby-stop-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('a, button')) {
          router.navigate(`/paradas/${item.dataset.stopId}`);
        }
      });
    });

  } catch (error) {
    console.error('Error searching nearby stops:', error);
    stopsList.innerHTML = `
      <div class="alert alert-error" style="padding: 16px;">
        <strong>Error al buscar paradas</strong>
        <p>${error.message}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top: 8px;" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

function renderNearbyStop(stop) {
  const distance = stop.distance || 0;
  const routeCount = stop.route_stops?.length || 0;
  const routes = stop.route_stops?.map(rs => rs.routes).filter(Boolean) || [];
  const routeCodes = [...new Set(routes.map(r => r.code))].slice(0, 3);

  return `
    <article class="nearby-stop-item card" data-stop-id="${stop.id}">
      <div class="stop-distance-badge">${formatDistance(distance)}</div>
      <div class="stop-main-info">
        <h3>${stop.name}</h3>
        <span class="badge badge-${getStopBadgeClass(stop.stop_type)}">${getStopTypeLabel(stop.stop_type)}</span>
      </div>
      <p class="stop-coords">${stop.latitude?.toFixed(6)}, ${stop.longitude?.toFixed(6)}</p>
      ${routeCodes.length > 0 ? `
        <div class="stop-routes">
          ${routeCodes.map(code => `<span class="route-badge-small" style="background: ${getRouteColor(code)}">${code}</span>`).join('')}
          ${routes.length > 3 ? `<span class="route-badge-small badge-muted">+${routes.length - 3} más</span>` : ''}
        </div>
      ` : ''}
      <div class="stop-actions">
        <a href="/paradas/${stop.id}" class="btn btn-ghost btn-sm" data-link>Ver detalle</a>
        <button class="btn btn-primary btn-sm" data-action="select-stop" data-stop-id="${stop.id}">Seleccionar</button>
      </div>
    </article>
  `;
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

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}