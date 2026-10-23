import { adminService } from '../services/admin.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

let currentFilters = { validationStatus: '', status: '', search: '' };
let searchDebounce = null;

export async function renderPage(container) {
  if (!authService.isAdmin()) {
    router.navigate('/');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('validationStatus')) currentFilters.validationStatus = urlParams.get('validationStatus');
  if (urlParams.get('status')) currentFilters.status = urlParams.get('status');

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Gestión de rutas</h1>
        <p class="page-subtitle">Administra y modera las rutas de transporte público</p>
      </header>

      <div class="page-toolbar">
        <div class="toolbar-search">
          <label for="admin-routes-search" class="sr-only">Buscar rutas</label>
          <input type="text" id="admin-routes-search" class="form-input" placeholder="Buscar por código, nombre..." autocomplete="off" value="${currentFilters.search}">
        </div>
        <div class="toolbar-filters">
          <select id="admin-filter-validation" aria-label="Filtrar rutas por validación" class="form-input form-select">
            <option value="">Todas</option>
            <option value="pending" ${currentFilters.validationStatus === 'pending' ? 'selected' : ''}>Pendientes</option>
            <option value="approved" ${currentFilters.validationStatus === 'approved' ? 'selected' : ''}>Aprobadas</option>
            <option value="rejected" ${currentFilters.validationStatus === 'rejected' ? 'selected' : ''}>Rechazadas</option>
          </select>
          <select id="admin-filter-status" aria-label="Filtrar rutas por estado" class="form-input form-select">
            <option value="">Todos los estados</option>
            <option value="normal" ${currentFilters.status === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="delay" ${currentFilters.status === 'delay' ? 'selected' : ''}>Retraso</option>
            <option value="detour" ${currentFilters.status === 'detour' ? 'selected' : ''}>Desvío</option>
            <option value="temporary_detour" ${currentFilters.status === 'temporary_detour' ? 'selected' : ''}>Desvío temporal</option>
            <option value="suspended" ${currentFilters.status === 'suspended' ? 'selected' : ''}>Suspendido</option>
            <option value="insufficient_info" ${currentFilters.status === 'insufficient_info' ? 'selected' : ''}>Sin información</option>
          </select>
        </div>
      </div>

      <div id="admin-routes-list" class="admin-routes-table-container">
        <div class="loading-state" style="padding: 48px; text-align: center;">
          <div class="loading-spinner"></div>
          <p>Cargando rutas...</p>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  loadAdminRoutes();
}

function attachListeners() {
  const searchInput = document.getElementById('admin-routes-search');
  const validationFilter = document.getElementById('admin-filter-validation');
  const statusFilter = document.getElementById('admin-filter-status');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      loadAdminRoutes();
    }, 300);
  });

  validationFilter.addEventListener('change', (e) => {
    currentFilters.validationStatus = e.target.value;
    loadAdminRoutes();
  });

  statusFilter.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadAdminRoutes();
  });
}

async function loadAdminRoutes() {
  const container = document.getElementById('admin-routes-list');

  container.innerHTML = `
    <div class="loading-state" style="padding: 48px; text-align: center;">
      <div class="loading-spinner"></div>
      <p>Cargando rutas...</p>
    </div>
  `;

  try {
    const { data: routes, error } = await adminService.getRoutes({
      validationStatus: currentFilters.validationStatus || undefined,
      status: currentFilters.status || undefined,
      search: currentFilters.search || undefined
    });

    if (error) throw error;

    if (!routes || routes.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px; text-align: center;">
          <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path></svg></div>
          <h2 class="empty-state-title">No hay rutas</h2>
          <p class="empty-state-text">No se encontraron rutas con los filtros actuales.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Origen → Destino</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Validación</th>
              <th>Variantes</th>
              <th>Reportes</th>
              <th>Última obs.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${routes.map(route => renderAdminRouteRow(route)).join('')}
          </tbody>
        </table>
      </div>
    `;

    attachRowListeners(routes);

  } catch (error) {
    console.error('Error loading admin routes:', error);
    container.innerHTML = `
      <div class="alert alert-error" style="padding: 24px;">
        <strong>Error al cargar rutas</strong>
        <p>${error.message}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top: 8px;" data-retry>Reintentar</button>
      </div>
    `;
  }
}

function renderAdminRouteRow(route) {
  const validationStatus = route.validation_status || 'pending';
  const status = route.status || 'insufficient_info';
  const variantCount = route.route_variants?.filter(v => v.active).length || 0;
  const reportCount = route.reports?.length || 0;
  const lastObs = route.bus_observations?.[0]?.observed_at;

  return `
    <tr data-route-id="${route.id}">
      <td><span class="route-badge" style="background: ${getRouteColor(route.code)}">${route.code}</span></td>
      <td><strong>${route.name}</strong></td>
      <td>${route.origin} → ${route.destination}</td>
      <td><span class="badge badge-${route.type === 'especial' ? 'warning' : 'info'}">${route.type === 'especial' ? 'Especial' : 'Regular'}</span></td>
      <td><span class="badge badge-${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span></td>
      <td><span class="badge badge-${getValidationBadgeClass(validationStatus)}">${getValidationLabel(validationStatus)}</span></td>
      <td>${variantCount}</td>
      <td>${reportCount}</td>
      <td>${lastObs ? formatRelativeTime(lastObs) : 'Nunca'}</td>
      <td>
        <div class="admin-actions">
          ${validationStatus === 'pending' ? `
            <button class="btn btn-success btn-sm btn-icon approve-btn" data-route-id="${route.id}" title="Aprobar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </button>
            <button class="btn btn-danger btn-sm btn-icon reject-btn" data-route-id="${route.id}" title="Rechazar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm btn-icon view-btn" data-route-id="${route.id}" title="Ver detalle">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="btn btn-secondary btn-sm btn-icon edit-btn" data-route-id="${route.id}" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path></svg>
          </button>
          ${validationStatus !== 'rejected' ? `
            <button class="btn btn-danger btn-sm btn-icon delete-btn" data-route-id="${route.id}" title="Eliminar (soft delete)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

function attachRowListeners(routes) {
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const routeId = btn.dataset.routeId;
      if (!confirm('¿Aprobar esta ruta? Se hará visible para todos los usuarios.')) return;

      const { error } = await adminService.approveRoute(routeId);
      if (error) {
        toastService.error('Error al aprobar');
      } else {
        toastService.success('Ruta aprobada');
        loadAdminRoutes();
      }
    });
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const routeId = btn.dataset.routeId;
      const reason = prompt('Motivo del rechazo:');
      if (!reason) return;

      const { error } = await adminService.rejectRoute(routeId, reason);
      if (error) {
        toastService.error('Error al rechazar');
      } else {
        toastService.success('Ruta rechazada');
        loadAdminRoutes();
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const routeId = btn.dataset.routeId;
      if (!confirm('¿Eliminar esta ruta? Se hará un borrado lógico (soft delete), los datos históricos se conservarán.')) return;

      const { error } = await adminService.softDeleteRoute(routeId);
      if (error) {
        toastService.error('Error al eliminar');
      } else {
        toastService.success('Ruta eliminada (soft delete)');
        loadAdminRoutes();
      }
    });
  });

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(`/rutas/${btn.dataset.routeId}`);
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(`/rutas/${btn.dataset.routeId}/editar`);
    });
  });
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

function getValidationLabel(status) {
  const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
  return labels[status] || status;
}

function getValidationBadgeClass(status) {
  const classes = { pending: 'warning', approved: 'success', rejected: 'error' };
  return classes[status] || 'muted';
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Nunca';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(dateString).toLocaleDateString('es-ES');
}