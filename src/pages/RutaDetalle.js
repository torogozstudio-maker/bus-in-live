import { routeService } from '../services/routes.js';
import { stopService } from '../services/stops.js';
import { incidentService } from '../services/incidents.js';
import { reportService } from '../services/reports.js';
import { favoriteService } from '../services/favorites.js';
import { etaService } from '../services/eta.js';
import { geolocationService } from '../services/geolocation.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { eventBus } from '../utils/eventBus.js';

let currentRoute = null;
let currentVariantId = null;
let observations = [];
let etaUpdateInterval = null;

export async function renderPage(container, route) {
  const routeId = route.params.id;

  container.innerHTML = `
    <div class="page-container">
      <div id="route-detail-content" class="loading-page">
        <div class="loading-state"><div class="loading-spinner"></div></div>
      </div>
    </div>
  `;

  await loadRouteDetail(routeId);
}

async function loadRouteDetail(routeId) {
  const content = document.getElementById('route-detail-content');

  try {
    const { data: route, error } = await routeService.getRouteById(routeId);
    if (error || !route) throw new Error('Ruta no encontrada');

    currentRoute = route;
    currentVariantId = null;

    const [stopsResult, obsResult, incidentsResult, freqResult, isFavResult] = await Promise.all([
      stopService.getStopsForRoute(routeId),
      routeService.getRouteObservations(routeId),
      incidentService.getActiveIncidentsForRoute(routeId),
      etaService.calculateFrequency(routeId),
      favoriteService.isFavorite(routeId)
    ]);

    const stops = stopsResult.data || [];
    observations = obsResult.data || [];
    const incidents = incidentsResult.data || [];
    const frequency = freqResult;
    const isFavorite = isFavResult;

    content.innerHTML = renderRouteDetail(route, stops, incidents, frequency, isFavorite);
    attachRouteDetailListeners(routeId);
    startEtaUpdates(routeId);

  } catch (error) {
    console.error('Error loading route detail:', error);
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 class="empty-state-title">Ruta no encontrada</h2>
        <p class="empty-state-text">La ruta que buscas no existe o ha sido eliminada.</p>
        <a href="/rutas" class="btn btn-primary" data-link>Volver a rutas</a>
      </div>
    `;
  }
}

function renderRouteDetail(route, stops, incidents, frequency, isFavorite) {
  const variants = route.route_variants?.filter(v => v.active) || [];
  const status = route.status || 'insufficient_info';
  const statusLabel = getStatusLabel(status);
  const groupedStops = groupStopsByDirection(stops);

  return `
    <header class="detail-header" style="background: linear-gradient(135deg, ${getRouteColor(route.code)}15, ${getRouteColor(route.code)}05); border-bottom: 1px solid var(--border);">
      <div class="container">
        <div class="detail-header-content">
          <div>
            <span class="route-badge-large" style="background-color: ${getRouteColor(route.code)}">${route.code}</span>
            <h1>${route.name}</h1>
            <p class="detail-meta">${route.origin} → ${route.destination}</p>
          </div>
          <div class="detail-header-actions">
            <span class="badge badge-${getStatusBadgeClass(status)} badge-lg">${statusLabel}</span>
            <button class="btn btn-secondary btn-icon" id="favorite-route-btn" aria-label="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${isFavorite ? 'var(--primary)' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
          </div>
        </div>

        <div class="detail-tags">
          <span class="badge badge-${route.type === 'especial' ? 'warning' : 'info'}">${route.type === 'especial' ? 'Especial' : 'Regular'}</span>
          ${variants.length > 0 ? `<span class="badge badge-muted">${variants.length} variante${variants.length > 1 ? 's' : ''}</span>` : ''}
          ${frequency.confidence !== 'insufficient' ? `<span class="badge badge-info">Frecuencia: ~${frequency.frequency} min</span>` : ''}
        </div>

        ${variants.length > 0 ? `
          <div class="variant-selector">
            <label>Variante: </label>
            <div class="variant-tabs">
              ${variants.map(v => `
                <button class="tab ${v.id === currentVariantId ? 'tab-active' : ''}" data-variant-id="${v.id}" data-direct="${v.direct}">
                  ${v.name} <span class="badge badge-${v.direct ? 'success' : 'info'} badge-xs">${v.direct ? 'Directo' : 'No directo'}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </header>

    <div class="container" style="padding-top: 24px; padding-bottom: 24px;">
      <div class="detail-grid">
        <section class="detail-main">
          <div class="card" id="map-section" style="height: 350px; overflow: hidden;">
            <div id="route-map" class="map-container" style="height: 100%;"></div>
          </div>

          <div class="card" style="margin-top: 16px;">
            <div class="card-header">
              <h3>Buses observados recientemente</h3>
            </div>
            <div class="card-body" id="observations-list">
              ${renderObservations(observations)}
            </div>
          </div>

          ${incidents.length > 0 ? `
            <div class="card" style="margin-top: 16px;">
              <div class="card-header">
                <h3>Incidencias activas</h3>
              </div>
              <div class="card-body">
                ${incidents.map(inc => renderIncidentItem(inc)).join('')}
              </div>
            </div>
          ` : ''}

          ${renderFrequencySection(frequency)}
        </section>

        <aside class="detail-sidebar">
          <div class="card">
            <div class="card-header">
              <h3>Paradas</h3>
            </div>
            <div class="card-body" style="padding: 0; max-height: 500px; overflow-y: auto;">
              ${renderStopsList(groupedStops)}
            </div>
          </div>

          <div class="card" style="margin-top: 16px;">
            <div class="card-header">
              <h3>Acciones</h3>
            </div>
            <div class="card-body">
              <a href="/mapa?route=${route.id}" class="btn btn-primary btn-full" data-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                Ver en mapa
              </a>
              <a href="/reportar?route=${route.id}" class="btn btn-secondary btn-full" data-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Reportar problema
              </a>
              <a href="/viajar?route=${route.id}" class="btn btn-secondary btn-full" data-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                Estoy viajando en esta ruta
              </a>
              ${authService.isAuthenticated() ? `
                <button class="btn btn-ghost btn-full" id="request-change-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Sugerir cambio en la ruta
                </button>
                <button class="btn btn-ghost btn-full btn-danger" id="request-deletion-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Solicitar eliminación
                </button>
              ` : ''}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function groupStopsByDirection(stops) {
  const grouped = { outbound: [], inbound: [] };
  stops.forEach(rs => {
    if (rs.stops) {
      const dir = rs.direction === 'outbound' ? 'outbound' : 'inbound';
      grouped[dir].push({ ...rs.stops, sequence: rs.sequence });
    }
  });
  grouped.outbound.sort((a, b) => a.sequence - b.sequence);
  grouped.inbound.sort((a, b) => a.sequence - b.sequence);
  return grouped;
}

function renderStopsList(grouped) {
  let html = '';

  if (grouped.outbound.length > 0) {
    html += `
      <div class="stops-direction">
        <h4 class="direction-title">Ida (${grouped.outbound.length})</h4>
        ${grouped.outbound.map(stop => renderStopItem(stop, 'outbound')).join('')}
      </div>
    `;
  }

  if (grouped.inbound.length > 0) {
    html += `
      <div class="stops-direction">
        <h4 class="direction-title">Vuelta (${grouped.inbound.length})</h4>
        ${grouped.inbound.map(stop => renderStopItem(stop, 'inbound')).join('')}
      </div>
    `;
  }

  if (!grouped.outbound.length && !grouped.inbound.length) {
    html = '<p class="empty-state-text" style="padding: 16px; text-align: center;">No hay paradas definidas para esta ruta</p>';
  }

  return html;
}

function renderStopItem(stop, direction) {
  const stopTypeIcon = getStopTypeIcon(stop.stop_type);
  return `
    <a href="/paradas/${stop.id}" class="stop-list-item" data-link>
      <span class="stop-sequence">${stop.sequence}</span>
      <div class="stop-info">
        <div class="stop-name-row">
          <span class="stop-name">${stop.name}</span>
          ${stopTypeIcon}
        </div>
        <span class="stop-coords">${stop.latitude?.toFixed(6)}, ${stop.longitude?.toFixed(6)}</span>
      </div>
    </a>
  `;
}

function getStopTypeIcon(type) {
  const icons = {
    terminal: '<span class="badge badge-success badge-xs">Terminal</span>',
    start: '<span class="badge badge-info badge-xs">Inicio</span>',
    end: '<span class="badge badge-error badge-xs">Fin</span>',
    intermediate: '<span class="badge badge-muted badge-xs">Intermedia</span>'
  };
  return icons[type] || '';
}

function renderObservations(obs) {
  if (!obs.length) {
    return `
      <div class="empty-state" style="padding: 24px;">
        <p class="empty-state-text">No hay observaciones recientes de buses en esta ruta.</p>
        <p class="empty-state-text" style="font-size: var(--text-xs); margin-top: 8px;">Cuando usuarios viajen y compartan su ubicación, aparecerán aquí.</p>
      </div>
    `;
  }

  return obs.slice(0, 10).map(o => `
    <div class="observation-item">
      <div class="obs-main">
        <span class="confidence-badge confidence-${o.confidence}">${getConfidenceLabel(o.confidence)}</span>
        <span class="obs-time">${getTimeAgo(o.observed_at)}</span>
      </div>
      <div class="obs-details">
        ${o.speed ? `<span>Vel: ${Math.round(o.speed)} km/h</span>` : ''}
        ${o.route_progress ? `<span>Progreso: ${Math.round(o.route_progress * 100)}%</span>` : ''}
        ${o.variant_id ? `<span class="chip chip-xs">Variante: ${o.variant_id.slice(0, 8)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function renderIncidentItem(incident) {
  const severityColors = { low: 'info', medium: 'warning', high: 'error', critical: 'error' };
  return `
    <div class="incident-item">
      <div class="incident-icon" style="background: var(--${severityColors[incident.severity] || 'info'}-soft); color: var(--${severityColors[incident.severity] || 'info'});">
        ${getIncidentIcon(incident.type)}
      </div>
      <div class="incident-info">
        <h4>${getIncidentLabel(incident.type)}</h4>
        <p>${incident.description || 'Sin descripción'}</p>
        <span class="badge badge-${severityColors[incident.severity] || 'info'} badge-xs">${incident.severity}</span>
      </div>
    </div>
  `;
}

function getIncidentIcon(type) {
  const icons = {
    accident: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    traffic: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    breakdown: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><line x1="12" y1="10" x2="12" y2="14"></line><line x1="10" y1="14" x2="14" y2="14"></line></svg>',
    blockage: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>',
    detour: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><polyline points="13 3 13 9 19 9"></polyline></svg>',
    suspended: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>',
    other: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
  };
  return icons[type] || icons.other;
}

function renderFrequencySection(frequency) {
  if (frequency.confidence === 'insufficient') {
    return `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header"><h3>Frecuencia estimada</h3></div>
        <div class="card-body">
          <div class="empty-state" style="padding: 16px;">
            <p class="empty-state-text">Aún no hay suficientes datos para calcular la frecuencia.</p>
            <p class="empty-state-text" style="font-size: var(--text-xs); margin-top: 4px;">Se necesitan al menos 3 observaciones de buses en la terminal.</p>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="card" style="margin-top: 16px;">
      <div class="card-header"><h3>Frecuencia estimada</h3></div>
      <div class="card-body">
        <div class="frequency-display">
          <div class="frequency-main">
            <span class="frequency-value">${frequency.frequency}</span>
            <span class="frequency-unit">min</span>
          </div>
          <div class="frequency-range">
            <span>Rango: ${frequency.minFrequency}–${frequency.maxFrequency} min</span>
            <span class="confidence-badge confidence-${frequency.confidence}">${getConfidenceLabel(frequency.confidence)}</span>
          </div>
          <p class="frequency-meta">Basado en ${frequency.observations} observaciones • Actualizado ${getTimeAgo(frequency.lastCalculated)}</p>
        </div>
      </div>
    </div>
  `;
}

function attachRouteDetailListeners(routeId) {
  document.getElementById('favorite-route-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('favorite-route-btn');
    const isFav = await favoriteService.isFavorite(routeId);
    if (isFav) {
      await favoriteService.removeFavorite(routeId);
      btn.querySelector('svg').setAttribute('fill', 'none');
      toastService.success('Eliminado de favoritos');
    } else {
      await favoriteService.addFavorite({ route_id: routeId });
      btn.querySelector('svg').setAttribute('fill', 'var(--primary)');
      toastService.success('Agregado a favoritos');
    }
  });

  document.querySelectorAll('.variant-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentVariantId = tab.dataset.variantId;
      document.querySelectorAll('.variant-tabs .tab').forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');
      loadRouteObservations(routeId);
    });
  });

  document.getElementById('request-change-btn')?.addEventListener('click', () => {
    router.navigate(`/rutas/${routeId}/editar`);
  });

  document.getElementById('request-deletion-btn')?.addEventListener('click', async () => {
    const reason = prompt('¿Por qué quieres solicitar la eliminación de esta ruta?');
    if (!reason) return;

    const { error } = await routeService.requestDeletion(routeId, reason, '');
    if (error) {
      toastService.error('Error al solicitar eliminación');
    } else {
      toastService.success('Solicitud de eliminación enviada. Un administrador la revisará.');
    }
  });

  initRouteMap(routeId);
}

async function initRouteMap(routeId) {
  const L = (await import('leaflet')).default;
  const mapEl = document.getElementById('route-map');
  if (!mapEl) return;

  if (mapEl._leaflet_map) {
    mapEl._leaflet_map.remove();
  }

  const { data: route } = await routeService.getRouteById(routeId);
  if (!route?.route_shapes?.length) return;

  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    scrollWheelZoom: true
  });
  mapEl._leaflet_map = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const shape = route.route_shapes[0];
  if (shape.geometry?.coordinates) {
    const coords = shape.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    L.polyline(coords, {
      color: getRouteColor(route.code),
      weight: 4,
      opacity: 0.9
    }).addTo(map);
    map.fitBounds(L.polyline(coords).getBounds(), { padding: [20, 20] });
  }

  const { data: stops } = await stopService.getStopsForRoute(routeId);
  stops?.forEach(rs => {
    if (rs.stops?.latitude && rs.stops?.longitude) {
      L.circleMarker([rs.stops.latitude, rs.stops.longitude], {
        radius: 6,
        color: '#2563EB',
        fillColor: '#2563EB',
        fillOpacity: 1,
        weight: 2
      }).bindPopup(`<strong>${rs.stops.name}</strong><br>Secuencia: ${rs.sequence}`).addTo(map);
    }
  });
}

async function loadRouteObservations(routeId) {
  const { data: obs } = await routeService.getRouteObservations(routeId, currentVariantId);
  observations = obs || [];
  const list = document.getElementById('observations-list');
  if (list) list.innerHTML = renderObservations(observations);
}

function startEtaUpdates(routeId) {
  if (etaUpdateInterval) clearInterval(etaUpdateInterval);
  etaUpdateInterval = setInterval(() => loadRouteObservations(routeId), 30000);
}

function getRouteColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}

function getStatusLabel(status) {
  const labels = { normal: 'Normal', delay: 'Retraso', detour: 'Desvío', temporary_detour: 'Desvío temporal', suspended: 'Suspendido', out_of_service: 'Fuera de servicio', insufficient_info: 'Sin información' };
  return labels[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = { normal: 'success', delay: 'warning', detour: 'warning', temporary_detour: 'info', suspended: 'error', out_of_service: 'error', insufficient_info: 'muted' };
  return classes[status] || 'muted';
}

function getConfidenceLabel(c) {
  const labels = { high: 'Alta', medium: 'Media', low: 'Baja', insufficient: 'Insuficiente' };
  return labels[c] || c;
}

function getIncidentLabel(type) {
  const labels = { accident: 'Accidente', traffic: 'Tráfico intenso', breakdown: 'Bus averiado', blockage: 'Bloqueo', detour: 'Desvío', suspended: 'Servicio suspendido', other: 'Otro' };
  return labels[type] || type;
}

function getTimeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'hace ' + diff + 's';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + ' h';
  return 'hace ' + Math.floor(diff / 86400) + ' d';
}