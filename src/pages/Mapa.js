import { loadLeaflet } from '../utils/leaflet.js';
import { icon } from '../utils/icons.js';
import { routeService } from '../services/routes.js';
import { stopService } from '../services/stops.js';
import { incidentService } from '../services/incidents.js';
import { geolocationService, GEOLOCATION_EVENTS } from '../services/geolocation.js';
import { eventBus } from '../utils/eventBus.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { getCurrentCity } from '../config/city.js';

let map = null;
let routesLayer = null;
let stopsLayer = null;
let observationsLayer = null;
let incidentsLayer = null;
let userMarker = null;
let selectedRouteId = null;
let selectedVariantId = null;
let showStops = true;
let showBuses = true;
let showIncidents = true;
let userLocation = null;

export async function renderPage(container) {
  container.innerHTML = `
    <div class="map-page">
    <h1 class="sr-only">Mapa de rutas y paradas</h1>
      <div class="map-header">
        <div class="map-search">
          <label for="route-search" class="sr-only">Buscar ruta</label>
          <input type="text" id="route-search" class="form-input" placeholder="Buscar ruta por número, nombre, origen, destino..." autocomplete="off">
          <div id="search-results" class="search-results" style="display: none;"></div>
        </div>
        <div class="map-controls">
          <button id="locate-btn" class="btn btn-secondary btn-icon" aria-label="Mi ubicación" title="Mi ubicación">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path></svg>
          </button>
          <button id="layers-btn" class="btn btn-secondary btn-icon" aria-label="Capas" title="Capas">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </button>
        </div>
      </div>

      <div id="map-container" class="map-container"></div>

      <div id="layers-panel" class="map-overlay-panel" style="display: none;">
        <div class="panel-content">
          <div class="panel-header">
            <h3>Capas del mapa</h3>
            <button class="btn btn-ghost btn-icon panel-close" aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="panel-body">
            <label class="layer-toggle">
              <input type="checkbox" id="layer-stops" checked>
              <span class="toggle-slider"></span>
              <span>Paradas</span>
            </label>
            <label class="layer-toggle">
              <input type="checkbox" id="layer-buses" checked>
              <span class="toggle-slider"></span>
              <span>Buses estimados</span>
            </label>
            <label class="layer-toggle">
              <input type="checkbox" id="layer-incidents" checked>
              <span class="toggle-slider"></span>
              <span>Incidencias</span>
            </label>
          </div>
        </div>
      </div>

      <div id="route-info-panel" class="map-bottom-panel" style="display: none;">
        <div class="panel-handle" aria-label="Expandir panel"></div>
        <div class="panel-content" id="route-info-content"></div>
      </div>

      <div id="stop-info-panel" class="map-bottom-panel" style="display: none;">
        <div class="panel-handle" aria-label="Expandir panel"></div>
        <div class="panel-content" id="stop-info-content"></div>
      </div>

      <a href="/reportar" class="map-fab" data-link aria-label="Reportar problema" title="Reportar problema">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </a>
    </div>
  `;

  try {
    await initMap();
    attachListeners();
    loadInitialData();
  } catch (error) {
    console.error('Error initializing map page:', error);
    container.innerHTML = `
      <div class="empty-state" style="padding: 48px; text-align: center; margin-top: 20px;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 class="empty-state-title">Error al cargar el mapa</h2>
        <p class="empty-state-text">No fue posible cargar el mapa. Inténtalo de nuevo.</p>
        <button class="btn btn-primary" style="margin-top: 8px;" data-link="/" data-nav-link>Volver al inicio</button>
      </div>
    `;
  }
}

async function initMap() {
  const L = await loadLeaflet();

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });

  map = L.map('map-container', {
    center: [13.9931, -89.5577],
    zoom: 13,
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.attribution({ position: 'bottomright' }).addTo(map);

  routesLayer = L.layerGroup().addTo(map);
  stopsLayer = L.layerGroup().addTo(map);
  observationsLayer = L.layerGroup().addTo(map);
  incidentsLayer = L.layerGroup().addTo(map);

  map.on('click', onMapClick);
}

function attachListeners() {
  const searchInput = document.getElementById('route-search');
  const searchResults = document.getElementById('search-results');
  const locateBtn = document.getElementById('locate-btn');
  const layersBtn = document.getElementById('layers-btn');
  const layersPanel = document.getElementById('layers-panel');
  const panelClose = layersPanel?.querySelector('.panel-close');
  const layerStops = document.getElementById('layer-stops');
  const layerBuses = document.getElementById('layer-buses');
  const layerIncidents = document.getElementById('layer-incidents');

  let searchDebounce = null;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => handleSearch(e.target.value), 300);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) handleSearch(searchInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });

  locateBtn.addEventListener('click', locateUser);
  layersBtn.addEventListener('click', () => layersPanel.style.display = 'block');
  panelClose?.addEventListener('click', () => layersPanel.style.display = 'none');

  layerStops?.addEventListener('change', (e) => {
    showStops = e.target.checked;
    toggleLayer(stopsLayer, showStops);
  });
  layerBuses?.addEventListener('change', (e) => {
    showBuses = e.target.checked;
    toggleLayer(observationsLayer, showBuses);
  });
  layerIncidents?.addEventListener('change', (e) => {
    showIncidents = e.target.checked;
    toggleLayer(incidentsLayer, showIncidents);
  });

  eventBus.on(GEOLOCATION_EVENTS.POSITION, (position) => {
    userLocation = position;
    updateUserMarker(position);
  });

  eventBus.on(GEOLOCATION_EVENTS.ERROR, (error) => {
    toastService.error(error.message);
  });
}

async function handleSearch(query) {
  const searchResults = document.getElementById('search-results');
  const searchInput = document.getElementById('route-search');
  if (!query.trim() || query.length < 2) {
    searchResults.style.display = 'none';
    return;
  }

  const { data: routes } = await routeService.searchRoutes(query, 8);

  if (routes.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">No se encontraron rutas</div>';
    searchResults.style.display = 'block';
    return;
  }

  searchResults.innerHTML = routes.map(route => `
    <button class="search-result-item" data-route-id="${route.id}">
      <span class="search-result-code">${route.code}</span>
      <span class="search-result-name">${route.name}</span>
      <span class="search-result-meta">${route.origin} → ${route.destination}</span>
    </button>
  `).join('');

  searchResults.querySelectorAll('.search-result-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const routeId = btn.dataset.routeId;
      selectRoute(routeId);
      searchResults.style.display = 'none';
      searchInput.value = '';
    });
  });

  searchResults.style.display = 'block';
}

async function loadInitialData() {
  await Promise.all([
    loadRoutes(),
    loadIncidents()
  ]);

  geolocationService.initialize().then(() => {
    geolocationService.getCurrentPosition().catch(() => {});
  });
}

async function loadRoutes() {
  const { data: routes } = await routeService.getRoutes({ city: getCurrentCity() });
  const L = await loadLeaflet();

  routesLayer.clearLayers();

  routes.forEach(route => {
    if (route.route_shapes && route.route_shapes.length > 0) {
      const shape = route.route_shapes[0];
      if (shape.geometry && shape.geometry.coordinates) {
        const coords = shape.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const polyline = L.polyline(coords, {
          color: getRouteColor(route.code),
          weight: 3,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round'
        });
        polyline.bindPopup(`<strong>Ruta ${route.code}</strong><br>${route.name}<br>${route.origin} → ${route.destination}`);
        polyline.on('click', () => selectRoute(route.id));
        polyline.addTo(routesLayer);
      }
    }
  });
}

async function loadIncidents() {
  const { data: incidents } = await incidentService.getIncidents({ activeOnly: true });
  const L = await loadLeaflet();

  incidentsLayer.clearLayers();

  incidents.forEach(incident => {
    if (incident.location && incident.location.coordinates) {
      const [lng, lat] = incident.location.coordinates;
      const marker = L.marker([lat, lng], {
        icon: createIncidentIcon(incident.type)
      });
      marker.bindPopup(`<strong>${getIncidentLabel(incident.type)}</strong><br>${incident.description || 'Sin descripción'}`);
      marker.addTo(incidentsLayer);
    }
  });
}

async function selectRoute(routeId) {
  selectedRouteId = routeId;
  selectedVariantId = null;

  const { data: route } = await routeService.getRouteById(routeId);
  if (!route) return;

  const L = await loadLeaflet();

  routesLayer.clearLayers();
  stopsLayer.clearLayers();
  observationsLayer.clearLayers();

  if (route.route_shapes && route.route_shapes.length > 0) {
    route.route_shapes.forEach(shape => {
      if (shape.geometry && shape.geometry.coordinates) {
        const coords = shape.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const isActive = shape.active && (!selectedVariantId || shape.variant_id === selectedVariantId);
        const polyline = L.polyline(coords, {
          color: getRouteColor(route.code),
          weight: isActive ? 4 : 2,
          opacity: isActive ? 0.9 : 0.4,
          dashArray: isActive ? null : '10, 5',
          lineCap: 'round',
          lineJoin: 'round'
        });
        polyline.bindPopup(`<strong>Ruta ${route.code}</strong><br>${route.name}<br>${shape.variant_id ? `Variante: ${route.route_variants?.find(v => v.id === shape.variant_id)?.name || ''}` : 'Ruta principal'}`);
        polyline.addTo(routesLayer);
      }
    });
  }

  if (showStops && route.stops) {
    const stopsBySeq = {};
    route.stops.forEach(rs => {
      if (rs.stops) {
        const key = `${rs.sequence}-${rs.direction}`;
        if (!stopsBySeq[key] || rs.variant_id === selectedVariantId) {
          stopsBySeq[key] = rs;
        }
      }
    });

    Object.values(stopsBySeq).forEach(rs => {
      const stop = rs.stops;
      if (stop.latitude && stop.longitude) {
        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: createStopIcon(stop.stop_type)
        });
        marker.bindPopup(`<strong>${stop.name}</strong><br>Secuencia: ${rs.sequence}<br>Dirección: ${rs.direction === 'outbound' ? 'Ida' : 'Vuelta'}`);
        marker.on('click', () => showStopInfo(stop, route));
        marker.addTo(stopsLayer);
      }
    });
  }

  await loadRouteObservations(routeId);

  showRouteInfoPanel(route);
  map.fitBounds(routesLayer.getBounds(), { padding: [20, 20] });
}

async function loadRouteObservations(routeId) {
  const { data: observations } = await routeService.getRouteObservations(routeId, selectedVariantId);
  const L = await loadLeaflet();

  observationsLayer.clearLayers();

  const recentObs = observations.filter(obs => {
    const age = Date.now() - new Date(obs.observed_at).getTime();
    return age < 10 * 60 * 1000;
  });

  recentObs.forEach(obs => {
    const marker = L.marker([obs.latitude, obs.longitude], {
      icon: createBusIcon(obs.confidence)
    });
    const confidenceLabel = getConfidenceLabel(obs.confidence);
    const timeAgo = getTimeAgo(obs.observed_at);
    marker.bindPopup(`
      <strong>Ruta ${obs.route_id}</strong><br>
      ${obs.variant_id ? `Variante: ${obs.variant_id}` : ''}<br>
      Velocidad: ${obs.speed ? Math.round(obs.speed) + ' km/h' : 'N/A'}<br>
      Confianza: ${confidenceLabel}<br>
      Última obs: ${timeAgo}
    `);
    marker.addTo(observationsLayer);
  });
}

function showRouteInfoPanel(route) {
  const panel = document.getElementById('route-info-panel');
  const content = document.getElementById('route-info-content');

  const variants = route.route_variants?.filter(v => v.active) || [];
  const statusLabel = getStatusLabel(route.status);

  content.innerHTML = `
    <div class="route-info-header">
      <div>
        <span class="route-badge">${route.code}</span>
        <h3>${route.name}</h3>
      </div>
      <span class="badge badge-${getStatusBadgeClass(route.status)}">${statusLabel}</span>
    </div>
    <p class="route-meta">${route.origin} → ${route.destination}</p>

    ${variants.length > 0 ? `
      <div class="variants-list">
        <h4>Variantes</h4>
        ${variants.map(v => `
          <button class="variant-btn ${v.id === selectedVariantId ? 'active' : ''}" data-variant-id="${v.id}">
            <span>${v.name}</span>
            <span class="badge badge-${v.direct ? 'success' : 'info'}">${v.direct ? 'Directo' : 'No directo'}</span>
          </button>
        `).join('')}
      </div>
    ` : ''}

    <div class="route-actions">
      <a href="/rutas/${route.id}" class="btn btn-primary btn-sm" data-link>Ver detalle</a>
      <button class="btn btn-secondary btn-sm" id="nearby-stops-btn">Paradas cercanas</button>
      <button class="btn btn-secondary btn-sm" id="report-route-btn">Reportar problema</button>
    </div>
  `;

  panel.style.display = 'block';

  content.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedVariantId = btn.dataset.variantId || null;
      selectRoute(route.id);
    });
  });

  document.getElementById('nearby-stops-btn')?.addEventListener('click', () => {
    router.navigate('/paradas-cercanas');
  });

  document.getElementById('report-route-btn')?.addEventListener('click', () => {
    router.navigate(`/reportar?route=${route.id}`);
  });
}

function showStopInfo(stop, route) {
  const panel = document.getElementById('stop-info-panel');
  const content = document.getElementById('stop-info-content');

  content.innerHTML = `
    <div class="stop-info-header">
      <h3>${stop.name}</h3>
      <span class="badge badge-info">${getStopTypeLabel(stop.stop_type)}</span>
    </div>
    <p class="stop-meta">Ruta ${route.code}: ${route.name}</p>
    <div class="stop-actions">
      <a href="/paradas/${stop.id}" class="btn btn-primary btn-sm" data-link>Ver detalle</a>
      <button class="btn btn-secondary btn-sm" id="favorite-stop-btn">${icon('star', 16)} Favorito</button>
    </div>
  `;

  panel.style.display = 'block';
}

function onMapClick(e) {
  document.getElementById('route-info-panel').style.display = 'none';
  document.getElementById('stop-info-panel').style.display = 'none';
  document.getElementById('layers-panel').style.display = 'none';
}

function locateUser() {
  geolocationService.getCurrentPosition().then(position => {
    if (map && position) {
      map.setView([position.latitude, position.longitude], 15);
      updateUserMarker(position);
    }
  }).catch(error => {
    toastService.error(error.message || 'No se pudo obtener tu ubicación');
  });
}

function updateUserMarker(position) {
  if (!map) return;

  if (userMarker) {
    userMarker.setLatLng([position.latitude, position.longitude]);
    userMarker.getElement().querySelector('.user-marker-accuracy').style.width = `${position.accuracy * 2}px`;
    userMarker.getElement().querySelector('.user-marker-accuracy').style.height = `${position.accuracy * 2}px`;
  } else {
    const L = window.L;
    userMarker = L.marker([position.latitude, position.longitude], {
      icon: L.divIcon({
        className: 'custom-marker custom-marker-user',
        html: `
          <div class="user-marker-pulse"></div>
          <div class="user-marker-accuracy" style="width: ${position.accuracy * 2}px; height: ${position.accuracy * 2}px;"></div>
          <div class="user-marker-dot"></div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(map);
  }
}

function toggleLayer(layer, show) {
  if (show) {
    layer.addTo(map);
  } else {
    map.removeLayer(layer);
  }
}

function createBusIcon(confidence) {
  if (!window.L) return null;
  const L = window.L;
  const colors = {
    high: '#16A34A',
    medium: '#EAB308',
    low: '#DC2626',
    insufficient: '#6B6B6B'
  };
  const color = colors[confidence] || colors.medium;

  return L.divIcon({
    className: 'custom-marker custom-marker-bus',
    html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><circle cx="10" cy="18" r="2" fill="white"></circle><circle cx="18" cy="18" r="2" fill="white"></circle></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function createStopIcon(type) {
  if (!window.L) return null;
  const L = window.L;
  const colors = {
    terminal: '#16A34A',
    start: '#2563EB',
    end: '#DC2626',
    normal: '#2563EB'
  };
  const color = colors[type] || colors.normal;

  return L.divIcon({
    className: 'custom-marker custom-marker-stop',
    html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function createIncidentIcon(type) {
  if (!window.L) return null;
  const L = window.L;
  return L.divIcon({
    className: 'custom-marker custom-marker-incident',
    html: `<div style="color: #DC2626; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${icon(type, 22)}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function getRouteColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

function getStatusLabel(status) {
  const labels = {
    normal: 'Normal',
    delay: 'Retraso',
    detour: 'Desvío',
    temporary_detour: 'Desvío temporal',
    suspended: 'Suspendido',
    out_of_service: 'Fuera de servicio',
    insufficient_info: 'Información insuficiente'
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = {
    normal: 'success',
    delay: 'warning',
    detour: 'warning',
    temporary_detour: 'info',
    suspended: 'error',
    out_of_service: 'error',
    insufficient_info: 'muted'
  };
  return classes[status] || 'muted';
}

function getStopTypeLabel(type) {
  const labels = {
    normal: 'Parada normal',
    terminal: 'Terminal',
    start: 'Inicio de ruta',
    end: 'Fin de ruta',
    intermediate: 'Intermedia'
  };
  return labels[type] || type;
}

function getIncidentLabel(type) {
  const labels = {
    accident: 'Accidente',
    traffic: 'Tráfico intenso',
    breakdown: 'Bus averiado',
    blockage: 'Bloqueo',
    detour: 'Desvío',
    suspended: 'Servicio suspendido',
    other: 'Otro'
  };
  return labels[type] || type;
}

function getConfidenceLabel(confidence) {
  const labels = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    insufficient: 'Insuficiente'
  };
  return labels[confidence] || confidence;
}

function getTimeAgo(timestamp) {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return 'hace ' + diff + 's';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + ' h';
  return 'hace ' + Math.floor(diff / 86400) + ' d';
}