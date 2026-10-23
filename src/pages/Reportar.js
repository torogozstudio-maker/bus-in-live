import { routeService } from '../services/routes.js';
import { stopService } from '../services/stops.js';
import { reportService, REPORT_TYPES } from '../services/reports.js';
import { geolocationService } from '../services/geolocation.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { icon } from '../utils/icons.js';
import { setFieldError, clearFieldError, clearAllErrors, focusFirstInvalid } from '../utils/formValidation.js';

let selectedRoute = null;
let selectedStop = null;
let userLocation = null;

export async function renderPage(container, route) {
  const preRouteId = route.query.get('route');
  const preStopId = route.query.get('stop');

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Reportar problema</h1>
        <p class="page-subtitle">Ayuda a la comunidad reportando incidencias en tiempo real</p>
      </header>

      <form id="report-form" class="report-form" novalidate>
        <div class="card">
          <div class="card-header">
            <h2>1. ¿Qué quieres reportar?</h2>
          </div>
          <div class="card-body">
            <div class="report-type-grid" id="report-types">
              ${REPORT_TYPES.map(type => `
                <label class="report-type-option" data-type="${type}">
                  <input type="radio" name="reportType" value="${type}" required aria-describedby="report-types-error">
                  <div class="report-type-icon">${getReportTypeIcon(type)}</div>
                  <div class="report-type-label">${getReportTypeLabel(type)}</div>
                </label>
              `).join('')}
            </div>
            <p class="field-error" id="report-types-error" role="alert"></p>
          </div>
        </div>

        <div class="card" style="display: none;" id="route-step">
          <div class="card-header">
            <h2>2. Selecciona la ruta afectada</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="report-route-search" class="form-label">Buscar ruta</label>
              <input type="text" id="report-route-search" class="form-input" placeholder="Número, nombre, origen, destino..." autocomplete="off" aria-describedby="report-route-search-error">
              <p class="field-error" id="report-route-search-error" role="alert"></p>
              <div id="report-route-results" class="search-results" style="display: none;"></div>
            </div>
            <div id="selected-report-route" class="selected-route-display" style="display: none;"></div>
          </div>
        </div>

        <div class="card" style="display: none;" id="stop-step">
          <div class="card-header">
            <h2>2. Selecciona la parada afectada</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="report-stop-search" class="form-label">Buscar parada</label>
              <input type="text" id="report-stop-search" class="form-input" placeholder="Nombre de la parada..." autocomplete="off" aria-describedby="report-route-search-error">
              <div id="report-stop-results" class="search-results" style="display: none;"></div>
            </div>
            <div id="selected-report-stop" class="selected-route-display" style="display: none;"></div>
          </div>
        </div>

        <div class="card" style="display: none;" id="location-step">
          <div class="card-header">
            <h2>Ubicación del problema</h2>
          </div>
          <div class="card-body">
            <div id="report-location-status" class="location-status">
              <div class="status-content">
                <div class="status-icon loading"></div>
                <div class="status-text">
                  <strong>Obteniendo ubicación...</strong>
                  <span>Usaremos tu posición actual como referencia</span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="report-location-desc" class="form-label">Descripción de la ubicación (opcional)</label>
              <textarea id="report-location-desc" class="form-input" rows="2" placeholder="Ej: Esquina de la 15 Av. Norte y 25 Calle Poniente, frente al semáforo"></textarea>
            </div>
          </div>
        </div>

        <div class="card" id="details-step" style="display: none;">
          <div class="card-header">
            <h2>Detalles del reporte</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="report-description" class="form-label">Describe lo que ocurre *</label>
              <textarea id="report-description" class="form-input" rows="4" required placeholder="Describe el problema con la mayor cantidad de detalles posible..." aria-describedby="report-description-error"></textarea>
              <p class="field-error" id="report-description-error" role="alert"></p>
            </div>
            <div class="form-group">
              <label for="report-evidence" class="form-label">Evidencia (opcional)</label>
              <input type="file" id="report-evidence" class="form-input" accept="image/*,video/*">
              <p class="form-hint">Foto o video del problema (máx. 10 MB)</p>
            </div>
          </div>
        </div>

        <div class="card" id="submit-step" style="display: none;">
          <div class="card-header">
            <h2>Enviar reporte</h2>
          </div>
          <div class="card-body">
            <div class="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                <strong>Tu reporte será anónimo</strong>
                <p style="margin-top: 4px; font-size: var(--text-sm);">Tu nombre y correo no se mostrarán públicamente. Los administradores revisarán el reporte antes de publicarlo.</p>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" id="submit-report-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              Enviar reporte
            </button>
          </div>
        </div>
      </form>

      <div id="report-success" class="card" style="display: none; text-align: center; padding: 48px 24px;">
        <div class="success-icon" style="width: 80px; height: 80px; border-radius: 50%; background: var(--success-soft); color: var(--success); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2>¡Reporte enviado!</h2>
        <p class="text-secondary" style="margin: 8px 0 24px;">Gracias por ayudar a la comunidad. Tu reporte será revisado por un administrador.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="/reportar" class="btn btn-primary" data-link>Nuevo reporte</a>
          <a href="/mapa" class="btn btn-secondary" data-link>Ver mapa</a>
        </div>
      </div>
    </div>
  `;

  attachListeners();

  if (preRouteId) {
    await preSelectRoute(preRouteId);
  }
  if (preStopId) {
    await preSelectStop(preStopId);
  }

  initializeLocation();
}

let searchDebounce = null;

function attachListeners() {
  const form = document.getElementById('report-form');
  const typeOptions = document.querySelectorAll('.report-type-option');
  const routeSearch = document.getElementById('report-route-search');
  const routeResults = document.getElementById('report-route-results');
  const stopSearch = document.getElementById('report-stop-search');
  const stopResults = document.getElementById('report-stop-results');

  typeOptions.forEach(option => {
    option.addEventListener('click', () => {
      typeOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      const type = option.dataset.type;
      document.getElementById('report-types-error').textContent = '';
      showStepsForType(type);
    });
  });

  const routeSearchInput = document.getElementById('report-route-search');
  const descriptionInput = document.getElementById('report-description');
  routeSearchInput.addEventListener('input', () => clearFieldError('report-route-search'));
  descriptionInput.addEventListener('input', () => clearFieldError('report-description'));

  routeSearch.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => searchRoutesForReport(e.target.value), 300);
  });

  routeSearch.addEventListener('focus', () => {
    if (routeSearch.value.trim()) searchRoutesForReport(routeSearch.value);
  });

  stopSearch.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => searchStopsForReport(e.target.value), 300);
  });

  stopSearch.addEventListener('focus', () => {
    if (stopSearch.value.trim()) searchStopsForReport(stopSearch.value);
  });

  document.addEventListener('click', (e) => {
    if (!routeSearch.contains(e.target) && !routeResults.contains(e.target)) {
      routeResults.style.display = 'none';
    }
    if (!stopSearch.contains(e.target) && !stopResults.contains(e.target)) {
      stopResults.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitReport();
  });
}

function showStepsForType(type) {
  const needsRoute = ['accident', 'traffic', 'breakdown', 'no_show', 'suspended', 'detour', 'incorrect_route', 'incorrect_eta'].includes(type);
  const needsStop = ['incorrect_stop', 'incorrect_info'].includes(type);

  document.getElementById('route-step').style.display = needsRoute ? 'block' : 'none';
  document.getElementById('stop-step').style.display = needsStop ? 'block' : 'none';
  document.getElementById('location-step').style.display = 'block';
  document.getElementById('details-step').style.display = 'block';
  document.getElementById('submit-step').style.display = 'block';
}

async function searchRoutesForReport(query) {
  const routeSearch = document.getElementById('report-route-search');
  const routeResults = document.getElementById('report-route-results');
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
      selectRouteForReport(route);
      routeResults.style.display = 'none';
      routeSearch.value = '';
    });
  });

  routeResults.style.display = 'block';
}

function selectRouteForReport(route) {
  selectedRoute = route;
  clearFieldError('report-route-search');
  document.getElementById('selected-report-route').innerHTML = `
    <div class="selected-route-card">
      <span class="route-badge" style="background: ${getRouteColor(route.code)}">${route.code}</span>
      <div><strong>${route.name}</strong><span>${route.origin} → ${route.destination}</span></div>
      <button class="btn btn-ghost btn-sm" id="change-report-route">Cambiar</button>
    </div>
  `;
  document.getElementById('selected-report-route').style.display = 'block';

  document.getElementById('change-report-route').addEventListener('click', () => {
    selectedRoute = null;
    document.getElementById('selected-report-route').style.display = 'none';
  });
}

async function searchStopsForReport(query) {
  const stopSearch = document.getElementById('report-stop-search');
  const stopResults = document.getElementById('report-stop-results');
  if (!query.trim() || query.length < 2) {
    stopResults.style.display = 'none';
    return;
  }

  const { data: stops } = await stopService.getStops({ search: query });

  if (!stops.length) {
    stopResults.innerHTML = '<div class="search-no-results">No se encontraron paradas</div>';
    stopResults.style.display = 'block';
    return;
  }

  stopResults.innerHTML = stops.map(s => `
    <button class="search-result-item" data-stop-id="${s.id}">
      <span class="search-result-name">${s.name}</span>
      <span class="search-result-meta">${s.latitude?.toFixed(4)}, ${s.longitude?.toFixed(4)}</span>
    </button>
  `).join('');

  stopResults.querySelectorAll('.search-result-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const stop = stops.find(s => s.id === btn.dataset.stopId);
      selectStopForReport(stop);
      stopResults.style.display = 'none';
      stopSearch.value = '';
    });
  });

  stopResults.style.display = 'block';
}

function selectStopForReport(stop) {
  selectedStop = stop;
  clearFieldError('report-route-search');
  document.getElementById('selected-report-stop').innerHTML = `
    <div class="selected-route-card">
      <span class="route-badge" style="background: var(--info)">${stop.name}</span>
      <button class="btn btn-ghost btn-sm" id="change-report-stop">Cambiar</button>
    </div>
  `;
  document.getElementById('selected-report-stop').style.display = 'block';

  document.getElementById('change-report-stop').addEventListener('click', () => {
    selectedStop = null;
    document.getElementById('selected-report-stop').style.display = 'none';
  });
}

async function preSelectRoute(routeId) {
  const { data: route } = await routeService.getRouteById(routeId);
  if (route) selectRouteForReport(route);
}

async function preSelectStop(stopId) {
  const { data: stop } = await stopService.getStopById(stopId);
  if (stop) selectStopForReport(stop);
}

async function initializeLocation() {
  try {
    const position = await geolocationService.getCurrentPosition({ timeout: 10000 });
    userLocation = position;
    updateLocationStatus(position);
  } catch (error) {
    document.getElementById('report-location-status').innerHTML = `
      <div class="status-content">
        <div class="status-icon error"></div>
        <div class="status-text">
          <strong>No se pudo obtener ubicación automática</strong>
          <span>Puedes describir la ubicación manualmente</span>
        </div>
      </div>
    `;
  }
}

function updateLocationStatus(position) {
  const accuracy = position.accuracy;
  document.getElementById('report-location-status').innerHTML = `
    <div class="status-content">
      <div class="status-icon success"></div>
      <div class="status-text">
        <strong>Ubicación obtenida</strong>
        <span>Precisión: ~${Math.round(accuracy)} m</span>
      </div>
      <span class="badge badge-${accuracy <= 20 ? 'success' : accuracy <= 50 ? 'warning' : 'error'}">${accuracy <= 20 ? 'Alta' : accuracy <= 50 ? 'Media' : 'Baja'} precisión</span>
    </div>
  `;
}

async function submitReport() {
  const form = document.getElementById('report-form');
  const formData = new FormData(form);
  const type = formData.get('reportType');
  const description = formData.get('reportDescription');
  const locationDesc = formData.get('reportLocationDesc');

  clearAllErrors(form);
  document.getElementById('report-types-error').textContent = '';

  let valid = true;
  if (!type) {
    document.getElementById('report-types-error').textContent = 'Selecciona el tipo de reporte';
    valid = false;
  }
  if (!selectedRoute && !selectedStop) {
    setFieldError('report-route-search', 'Selecciona una ruta o parada afectada');
    valid = false;
  }
  if (!description || description.trim().length < 10) {
    setFieldError('report-description', 'Describe el problema con al menos 10 caracteres');
    valid = false;
  }
  if (!valid) {
    focusFirstInvalid(form);
    return;
  }

  const submitBtn = document.getElementById('submit-report-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="loading-spinner"></div> Enviando...';

  try {
    const location = userLocation ? {
      type: 'Point',
      coordinates: [userLocation.longitude, userLocation.latitude]
    } : null;

    const { data, error } = await reportService.createReport({
      type,
      route_id: selectedRoute?.id,
      stop_id: selectedStop?.id,
      location,
      description: `${description}${locationDesc ? '\n\nUbicación: ' + locationDesc : ''}`,
      evidence: null
    });

    if (error) throw error;

    form.style.display = 'none';
    document.getElementById('report-success').style.display = 'block';
    toastService.success('Reporte enviado correctamente');

  } catch (error) {
    console.error('Error submitting report:', error);
    toastService.error(error.message || 'Error al enviar el reporte');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Enviar reporte';
  }
}

function getReportTypeLabel(type) {
  const labels = {
    accident: 'Accidente',
    traffic: 'Tráfico intenso',
    breakdown: 'Bus averiado',
    no_show: 'Bus no pasó',
    suspended: 'Ruta suspendida',
    detour: 'Desvío',
    incorrect_info: 'Información incorrecta',
    incorrect_stop: 'Parada incorrecta',
    incorrect_route: 'Ruta incorrecta',
    incorrect_eta: 'ETA incorrecto',
    other: 'Otro problema'
  };
  return labels[type] || type;
}

function getReportTypeIcon(type) {
  return icon(type, 24);
}

function getRouteColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}