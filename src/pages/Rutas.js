import { routeService } from '../services/routes.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { getCurrentCity } from '../config/city.js';
import { escapeHtml } from '../utils/sanitize.js';

export async function renderPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Rutas</h1>
        <p class="page-subtitle">Explora las rutas de transporte público disponibles</p>
      </header>

      <div class="page-toolbar">
        <div class="toolbar-search">
          <label for="routes-search" class="sr-only">Buscar rutas</label>
          <input type="text" id="routes-search" class="form-input" placeholder="Buscar por número, nombre, origen, destino..." autocomplete="off">
        </div>
        <div class="toolbar-filters">
          <select id="filter-type" aria-label="Filtrar rutas por tipo" class="form-input form-select">
            <option value="">Todos los tipos</option>
            <option value="regular">Regular</option>
            <option value="especial">Especial</option>
          </select>
          <select id="filter-status" aria-label="Filtrar rutas por estado" class="form-input form-select">
            <option value="">Todos los estados</option>
            <option value="normal">Normal</option>
            <option value="delay">Retraso</option>
            <option value="detour">Desvío</option>
            <option value="temporary_detour">Desvío temporal</option>
            <option value="suspended">Suspendido</option>
            <option value="insufficient_info">Sin información</option>
          </select>
        </div>
        ${authService.isAuthenticated() ? `
          <a href="/rutas/crear" class="btn btn-primary" data-link>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Agregar ruta
          </a>
        ` : ''}
      </div>

      <div id="routes-list" class="routes-grid">
        <div class="loading-state" style="grid-column: 1 / -1;">
          <div class="loading-spinner"></div>
          <p>Cargando rutas...</p>
        </div>
      </div>

      <div id="routes-empty" class="empty-state" style="display: none; grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><circle cx="10" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>
        </div>
        <h2 class="empty-state-title">No hay rutas disponibles</h2>
        <p class="empty-state-text">La comunidad aún no ha agregado rutas para esta zona.</p>
        ${authService.isAuthenticated() ? '<a href="/rutas/crear" class="btn btn-primary" style="margin-top: 16px;" data-link>Agregar la primera ruta</a>' : ''}
      </div>
    </div>
  `;

  attachListeners();
  loadRoutes();
}

let currentFilters = { search: '', type: '', status: '' };
let searchDebounce = null;

function attachListeners() {
  const searchInput = document.getElementById('routes-search');
  const typeFilter = document.getElementById('filter-type');
  const statusFilter = document.getElementById('filter-status');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      loadRoutes();
    }, 300);
  });

  typeFilter.addEventListener('change', (e) => {
    currentFilters.type = e.target.value;
    loadRoutes();
  });

  statusFilter.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadRoutes();
  });
}

async function loadRoutes() {
  const listContainer = document.getElementById('routes-list');
  const emptyContainer = document.getElementById('routes-empty');

  listContainer.innerHTML = `
    <div class="loading-state" style="grid-column: 1 / -1;">
      <div class="loading-spinner"></div>
      <p>Cargando rutas...</p>
    </div>
  `;
  emptyContainer.style.display = 'none';

  try {
    const { data: routes, error } = await routeService.getRoutes({
      city: getCurrentCity(),
      type: currentFilters.type || undefined,
      status: currentFilters.status || undefined,
      search: currentFilters.search || undefined
    });

    if (error) throw error;

    if (!routes || routes.length === 0) {
      listContainer.innerHTML = '';
      emptyContainer.style.display = 'block';
      return;
    }

    emptyContainer.style.display = 'none';
    listContainer.innerHTML = routes.map(route => renderRouteCard(route)).join('');

    listContainer.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('a, button')) {
          router.navigate(`/rutas/${card.dataset.routeId}`);
        }
      });
    });

  } catch (error) {
    console.error('Error loading routes:', error);
    listContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 class="empty-state-title">Error al cargar rutas</h2>
        <p class="empty-state-text">Inténtalo de nuevo más tarde.</p>
        <button class="btn btn-primary" style="margin-top: 16px;" data-retry>Reintentar</button>
      </div>
    `;
  }
}

function renderRouteCard(route) {
  const variants = route.route_variants?.filter(v => v.active) || [];
  const hasDirect = variants.some(v => v.direct);
  const status = route.status || 'insufficient_info';
  const statusLabel = getStatusLabel(status);

  return `
    <article class="route-card" data-route-id="${route.id}">
      <div class="route-card-header">
        <span class="route-badge" style="background-color: ${getRouteColor(route.code)}">${escapeHtml(route.code)}</span>
        <span class="badge badge-${getStatusBadgeClass(status)}">${statusLabel}</span>
      </div>
      <h3 class="route-name">${escapeHtml(route.name)}</h3>
      <p class="route-path">${escapeHtml(route.origin)} → ${escapeHtml(route.destination)}</p>
      <div class="route-meta">
        <span class="route-type badge badge-${route.type === 'especial' ? 'warning' : 'info'}">${route.type === 'especial' ? 'Especial' : 'Regular'}</span>
        ${hasDirect ? '<span class="chip chip-primary">Tiene variante directa</span>' : ''}
        ${variants.length > 1 ? `<span class="chip">${variants.length} variante${variants.length > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="route-card-footer">
        <span class="route-updated">Actualizado: ${formatRelativeTime(route.updated_at)}</span>
        <a href="/rutas/${route.id}" class="btn btn-ghost btn-sm" data-link>Ver detalle</a>
      </div>
    </article>
  `;
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
    insufficient_info: 'Sin información'
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

function formatRelativeTime(dateString) {
  if (!dateString) return 'Desconocido';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(dateString).toLocaleDateString('es-ES');
}