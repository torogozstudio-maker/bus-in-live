import { stopService } from '../services/stops.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Paradas</h1>
        <p class="page-subtitle">Todas las paradas de transporte público</p>
      </header>

      <div class="page-toolbar">
        <div class="toolbar-search">
          <label for="stops-search" class="sr-only">Buscar paradas</label>
          <input type="text" id="stops-search" class="form-input" placeholder="Buscar parada por nombre..." autocomplete="off">
        </div>
      </div>

      <div id="stops-list" class="stops-grid">
        <div class="loading-state" style="grid-column: 1 / -1;">
          <div class="loading-spinner"></div>
          <p>Cargando paradas...</p>
        </div>
      </div>

      <div id="stops-empty" class="empty-state" style="display: none; grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <h2 class="empty-state-title">No hay paradas</h2>
        <p class="empty-state-text">La comunidad aún no ha agregado paradas.</p>
      </div>
    </div>
  `;

  attachListeners();
  loadStops();
}

let searchDebounce = null;

function attachListeners() {
  const searchInput = document.getElementById('stops-search');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadStops(e.target.value.trim()), 300);
  });
}

async function loadStops(search = '') {
  const listContainer = document.getElementById('stops-list');
  const emptyContainer = document.getElementById('stops-empty');

  listContainer.innerHTML = `
    <div class="loading-state" style="grid-column: 1 / -1;">
      <div class="loading-spinner"></div>
      <p>Cargando paradas...</p>
    </div>
  `;
  emptyContainer.style.display = 'none';

  try {
    const { data: stops, error } = await stopService.getStops({ search: search || undefined });
    if (error) throw error;

    if (!stops || stops.length === 0) {
      listContainer.innerHTML = '';
      emptyContainer.style.display = 'block';
      return;
    }

    emptyContainer.style.display = 'none';
    listContainer.innerHTML = stops.map(stop => renderStopCard(stop)).join('');

    listContainer.querySelectorAll('.stop-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('a, button')) {
          router.navigate(`/paradas/${card.dataset.stopId}`);
        }
      });
    });

  } catch (error) {
    console.error('Error loading stops:', error);
    listContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
        <h2 class="empty-state-title">Error al cargar paradas</h2>
        <button class="btn btn-primary" style="margin-top: 16px;" data-retry>Reintentar</button>
      </div>
    `;
  }
}

function renderStopCard(stop) {
  const routeCount = stop.route_stops?.length || 0;
  const routes = stop.route_stops?.map(rs => rs.routes).filter(Boolean) || [];
  const routeCodes = [...new Set(routes.map(r => r.code))].slice(0, 3);

  return `
    <article class="stop-card" data-stop-id="${stop.id}">
      <div class="stop-card-header">
        <h3>${stop.name}</h3>
        <span class="badge badge-${getStopBadgeClass(stop.stop_type)}">${getStopTypeLabel(stop.stop_type)}</span>
      </div>
      <p class="stop-coords">${stop.latitude?.toFixed(6)}, ${stop.longitude?.toFixed(6)}</p>
      ${routeCodes.length > 0 ? `
        <div class="stop-routes">
          ${routeCodes.map(code => `<span class="route-badge-small" style="background: ${getRouteColor(code)}">${code}</span>`).join('')}
          ${routes.length > 3 ? `<span class="route-badge-small badge-muted">+${routes.length - 3} más</span>` : ''}
        </div>
      ` : '<p class="stop-no-routes">Sin rutas asignadas</p>'}
      <div class="stop-card-footer">
        <span>${routeCount} ruta${routeCount !== 1 ? 's' : ''}</span>
        <a href="/paradas/${stop.id}" class="btn btn-ghost btn-sm" data-link>Ver detalle</a>
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