import { routeService } from '../services/routes.js';
import { tripSessionService, TRIP_EVENTS } from '../services/tripSession.js';
import { geolocationService, GEOLOCATION_EVENTS } from '../services/geolocation.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { eventBus } from '../utils/eventBus.js';
import { getCurrentCity } from '../config/city.js';

let selectedRoute = null;
let selectedVariant = null;
let isDirect = false;
let currentSession = null;
let currentPosition = null;
let positionUpdateInterval = null;
let map = null;

export async function renderPage(container, route) {
  const preSelectedRouteId = route.query.get('route');

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Estoy viajando</h1>
        <p class="page-subtitle">Comparte tu ubicación para ayudar a la comunidad a estimar llegadas</p>
      </header>

      <div id="trip-setup" class="trip-setup">
        <div class="card">
          <div class="card-header">
            <h3>1. Selecciona tu ruta</h3>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="trip-route-search" class="form-label">Buscar ruta</label>
              <input type="text" id="trip-route-search" class="form-input" placeholder="Número, nombre, origen, destino..." autocomplete="off">
              <div id="trip-route-results" class="search-results" style="display: none;"></div>
            </div>
            <div id="selected-route-display" class="selected-route-display" style="display: none;"></div>
          </div>
        </div>

        <div class="card" style="display: none;" id="variant-step">
          <div class="card-header">
            <h3>2. Selecciona la variante (opcional)</h3>
          </div>
          <div class="card-body">
            <p class="form-hint">Si no estás seguro, déjalo en "No directo" (por defecto)</p>
            <div class="variant-options" id="variant-options"></div>
            <div class="form-group">
              <label class="form-checkbox">
                <input type="checkbox" id="trip-is-direct" value="1">
                <span class="checkbox-custom"></span>
                <strong>Directo</strong> - Trayectoria más corta habitual
              </label>
              <p class="form-hint">Marca esto solo si el bus toma la ruta directa (expresa/corta)</p>
            </div>
          </div>
        </div>

        <div class="card" style="display: none;" id="consent-step">
          <div class="card-header">
            <h3>3. Compartir ubicación</h3>
          </div>
          <div class="card-body">
            <div class="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                <strong>¿Qué se comparte?</strong>
                <ul style="margin: 8px 0 0 20px; font-size: var(--text-sm);">
                  <li>Tu posición GPS mientras viajas</li>
                  <li>Velocidad y dirección aproximadas</li>
                  <li>La ruta y variante seleccionada</li>
                </ul>
                <p style="margin-top: 8px; font-size: var(--text-sm);">
                  <strong>Tu identidad NO se comparte.</strong> Los datos se usan anónimamente para estimar llegadas.
                  Puedes detener el seguimiento en cualquier momento.
                </p>
              </div>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input type="checkbox" id="trip-consent" value="1" required>
                <span class="checkbox-custom"></span>
                Acepto compartir mi ubicación anónimamente durante este viaje
              </label>
            </div>
            <button class="btn btn-primary btn-full btn-lg" id="start-trip-btn" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
              Iniciar viaje
            </button>
          </div>
        </div>
      </div>

      <div id="trip-active" class="trip-active" style="display: none;">
        <div class="trip-header-card card">
          <div class="trip-route-info">
            <span class="route-badge" id="active-route-badge" style="background: var(--primary)"></span>
            <div>
              <h3 id="active-route-name"></h3>
              <p id="active-route-variant"></p>
            </div>
          </div>
          <div class="trip-status">
            <span class="status-indicator active"></span>
            <span>Compartiendo ubicación</span>
          </div>
          <button class="btn btn-danger" id="end-trip-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            Finalizar viaje
          </button>
        </div>

        <div class="trip-stats-grid">
          <div class="card stat-card">
            <div class="stat-icon" style="background: var(--primary-soft); color: var(--primary);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="stat-info">
              <div class="stat-value" id="trip-speed">-- km/h</div>
              <div class="stat-label">Velocidad</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background: var(--info-soft); color: var(--info);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="stat-info">
              <div class="stat-value" id="trip-next-stop">-- min</div>
              <div class="stat-label">Próxima parada</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background: var(--success-soft); color: var(--success);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div class="stat-info">
              <div class="stat-value" id="trip-progress">0%</div>
              <div class="stat-label">Progreso</div>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon" style="background: var(--warning-soft); color: var(--warning);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <div class="stat-info">
              <div class="stat-value" id="trip-gps-status">Esperando GPS</div>
              <div class="stat-label">GPS</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: 16px;">
          <div class="card-header">
            <h3>Mapa del viaje</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <div id="trip-map" class="map-container" style="height: 300px;"></div>
          </div>
        </div>

        <div class="card" style="margin-top: 16px;">
          <div class="card-header">
            <h3>Detalles del seguimiento</h3>
          </div>
          <div class="card-body">
            <div class="trip-details">
              <div class="detail-row">
                <span>Ruta</span>
                <strong id="detail-route"></strong>
              </div>
              <div class="detail-row">
                <span>Variante</span>
                <strong id="detail-variant"></strong>
              </div>
              <div class="detail-row">
                <span>Tipo</span>
                <strong id="detail-type"></strong>
              </div>
              <div class="detail-row">
                <span>Iniciado</span>
                <strong id="detail-started"></strong>
              </div>
              <div class="detail-row">
                <span>Observaciones enviadas</span>
                <strong id="detail-sent">0</strong>
              </div>
              <div class="detail-row">
                <span>Última actualización</span>
                <strong id="detail-last-update">--</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  await loadRoutesForTrip(preSelectedRouteId);
}

let searchDebounce = null;

function attachListeners() {
  const routeSearch = document.getElementById('trip-route-search');
  const routeResults = document.getElementById('trip-route-results');
  const consentCheckbox = document.getElementById('trip-consent');
  const startBtn = document.getElementById('start-trip-btn');
  const endTripBtn = document.getElementById('end-trip-btn');
  const directCheckbox = document.getElementById('trip-is-direct');

  routeSearch.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => searchRoutesForTrip(e.target.value), 300);
  });

  routeSearch.addEventListener('focus', () => {
    if (routeSearch.value.trim()) searchRoutesForTrip(routeSearch.value);
  });

  document.addEventListener('click', (e) => {
    if (!routeSearch.contains(e.target) && !routeResults.contains(e.target)) {
      routeResults.style.display = 'none';
    }
  });

  consentCheckbox.addEventListener('change', (e) => {
    startBtn.disabled = !e.target.checked;
  });

  directCheckbox.addEventListener('change', (e) => {
    isDirect = e.target.checked;
  });

  startBtn.addEventListener('click', startTrip);
  endTripBtn.addEventListener('click', endTrip);

  eventBus.on(GEOLOCATION_EVENTS.POSITION, (position) => {
    currentPosition = position;
    updateTripDisplay(position);
  });

  eventBus.on(GEOLOCATION_EVENTS.ERROR, (error) => {
    document.getElementById('trip-gps-status').textContent = 'Error GPS';
    document.getElementById('trip-gps-status').style.color = 'var(--error)';
  });

  eventBus.on(TRIP_EVENTS.STARTED, (session) => {
    currentSession = session;
    showActiveTrip();
  });

  eventBus.on(TRIP_EVENTS.ENDED, () => {
    currentSession = null;
    showSetup();
  });
}

async function loadRoutesForTrip(preSelectedId) {
  const { data: routes } = await routeService.getRoutes({ city: getCurrentCity(), status: 'normal' });

  if (preSelectedId) {
    const route = routes.find(r => r.id === preSelectedId);
    if (route) selectRouteForTrip(route);
  }
}

async function searchRoutesForTrip(query) {
  const routeResults = document.getElementById('trip-route-results');
  if (!query.trim() || query.length < 2) {
    routeResults.style.display = 'none';
    return;
  }

  const { data: routes } = await routeService.searchRoutes(query, 8);

  if (!routes.length) {
    routeResults.innerHTML = '<div class="search-no-results">No se encontraron rutas</div>';
    routeResults.style.display = 'block';
    return;
  }

  routeResults.innerHTML = routes.map(r => `
    <button class="search-result-item" data-route-id="${r.id}">
      <span class="search-result-code">${r.code}</span>
      <span class="search-result-name">${r.name}</span>
      <span class="search-result-meta">${r.origin} → ${r.destination}</span>
    </button>
  `).join('');

  routeResults.querySelectorAll('.search-result-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = routes.find(r => r.id === btn.dataset.routeId);
      selectRouteForTrip(route);
      routeResults.style.display = 'none';
      routeSearch.value = '';
    });
  });

  routeResults.style.display = 'block';
}

function selectRouteForTrip(route) {
  selectedRoute = route;
  selectedVariant = null;
  isDirect = false;

  document.getElementById('selected-route-display').innerHTML = `
    <div class="selected-route-card">
      <span class="route-badge" style="background: ${getRouteColor(route.code)}">${route.code}</span>
      <div>
        <strong>${route.name}</strong>
        <span>${route.origin} → ${route.destination}</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="change-route-btn">Cambiar</button>
    </div>
  `;
  document.getElementById('selected-route-display').style.display = 'block';

  document.getElementById('change-route-btn').addEventListener('click', () => {
    selectedRoute = null;
    document.getElementById('selected-route-display').style.display = 'none';
    document.getElementById('variant-step').style.display = 'none';
    document.getElementById('consent-step').style.display = 'none';
  });

  loadVariantsForTrip(route.id);
}

async function loadVariantsForTrip(routeId) {
  const { data: route } = await routeService.getRouteById(routeId);
  const variants = route?.route_variants?.filter(v => v.active) || [];
  const container = document.getElementById('variant-options');

  if (variants.length === 0) {
    container.innerHTML = '<p class="form-hint">Esta ruta no tiene variantes definidas</p>';
  } else {
    container.innerHTML = variants.map(v => `
      <label class="variant-option">
        <input type="radio" name="trip-variant" value="${v.id}" ${!selectedVariant ? 'checked' : ''}>
        <div class="variant-option-content">
          <strong>${v.name}</strong>
          <span class="badge badge-${v.direct ? 'success' : 'info'}">${v.direct ? 'Directo' : 'No directo'}</span>
        </div>
      </label>
    `).join('');

    container.querySelectorAll('input[name="trip-variant"]').forEach(input => {
      input.addEventListener('change', (e) => {
        selectedVariant = e.target.value;
        const variant = variants.find(v => v.id === selectedVariant);
        isDirect = variant?.direct || false;
        document.getElementById('trip-is-direct').checked = isDirect;
      });
    });
  }

  document.getElementById('variant-step').style.display = 'block';
  document.getElementById('consent-step').style.display = 'block';
}

async function startTrip() {
  if (!selectedRoute) {
    toastService.error('Selecciona una ruta primero');
    return;
  }

  try {
    await tripSessionService.startSession(selectedRoute.id, selectedVariant, isDirect);
  } catch (error) {
    console.error('Error starting trip:', error);
    toastService.error(error.message || 'Error al iniciar el viaje');
  }
}

function showActiveTrip() {
  document.getElementById('trip-setup').style.display = 'none';
  document.getElementById('trip-active').style.display = 'block';

  if (selectedRoute) {
    document.getElementById('active-route-badge').textContent = selectedRoute.code;
    document.getElementById('active-route-name').textContent = selectedRoute.name;
    document.getElementById('active-route-variant').textContent = selectedVariant
      ? `Variante: ${selectedRoute.route_variants?.find(v => v.id === selectedVariant)?.name || 'Personalizada'}`
      : 'Sin variante específica';

    document.getElementById('detail-route').textContent = `${selectedRoute.code} - ${selectedRoute.name}`;
    document.getElementById('detail-variant').textContent = selectedVariant ? 'Específica' : 'No especificada';
    document.getElementById('detail-type').textContent = isDirect ? 'Directo' : 'No directo';
    document.getElementById('detail-started').textContent = new Date().toLocaleTimeString();
  }

  geolocationService.startTracking({ enableHighAccuracy: true, maximumAge: 5000 });
  initTripMap();
  startPositionUpdates();
}

function showSetup() {
  document.getElementById('trip-setup').style.display = 'block';
  document.getElementById('trip-active').style.display = 'none';
  stopPositionUpdates();
  if (map) { map.remove(); map = null; }
}

async function endTrip() {
  try {
    await tripSessionService.endSession();
    toastService.success('Viaje finalizado. ¡Gracias por compartir tu ubicación!');
  } catch (error) {
    console.error('Error ending trip:', error);
    toastService.error('Error al finalizar el viaje');
  }
}

function updateTripDisplay(position) {
  const speed = position.speed ? (position.speed * 3.6).toFixed(1) : '--';
  document.getElementById('trip-speed').textContent = speed + (position.speed ? ' km/h' : '');
  document.getElementById('trip-gps-status').textContent = `Precisión: ${Math.round(position.accuracy)} m`;
  document.getElementById('trip-gps-status').style.color = position.accuracy <= 20 ? 'var(--success)' : position.accuracy <= 50 ? 'var(--warning)' : 'var(--error)';
  document.getElementById('detail-last-update').textContent = new Date().toLocaleTimeString();

  const sentCount = parseInt(document.getElementById('detail-sent').textContent) || 0;
  document.getElementById('detail-sent').textContent = sentCount + 1;
}

function startPositionUpdates() {
  positionUpdateInterval = setInterval(() => {
    if (currentPosition && selectedRoute) {
      updateTripMap(currentPosition);
    }
  }, 5000);
}

function stopPositionUpdates() {
  if (positionUpdateInterval) {
    clearInterval(positionUpdateInterval);
    positionUpdateInterval = null;
  }
}

async function initTripMap() {
  const L = (await import('leaflet')).default;
  const mapEl = document.getElementById('trip-map');
  if (!mapEl) return;

  map = L.map(mapEl, { zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);

  if (selectedRoute?.route_shapes?.length) {
    const shape = selectedRoute.route_shapes[0];
    if (shape.geometry?.coordinates) {
      const coords = shape.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      L.polyline(coords, { color: getRouteColor(selectedRoute.code), weight: 3, opacity: 0.7 }).addTo(map);
      map.fitBounds(L.polyline(coords).getBounds(), { padding: [20, 20] });
    }
  }

  if (currentPosition) {
    updateTripMap(currentPosition);
  }
}

function updateTripMap(position) {
  if (!map) return;

  const latlng = [position.latitude, position.longitude];

  if (!window.tripUserMarker) {
    window.tripUserMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'custom-marker custom-marker-user',
        html: '<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(map);
  } else {
    window.tripUserMarker.setLatLng(latlng);
  }

  map.setView(latlng, map.getZoom());
}

function getRouteColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}