import { adminService } from '../services/admin.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { escapeHtml } from '../utils/sanitize.js';

let currentTab = 'changes';
let currentFilters = { status: '' };

export async function renderPage(container) {
  if (!authService.isAdmin()) {
    router.navigate('/');
    return;
  }

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Solicitudes de cambios</h1>
        <p class="page-subtitle">Revisa y gestiona las solicitudes de la comunidad</p>
      </header>

      <div class="tabs" role="tablist">
        <button class="tab ${currentTab === 'changes' ? 'tab-active' : ''}" data-tab="changes" role="tab" aria-selected="${currentTab === 'changes'}">Cambios de ruta</button>
        <button class="tab ${currentTab === 'deletions' ? 'tab-active' : ''}" data-tab="deletions" role="tab" aria-selected="${currentTab === 'deletions'}">Eliminaciones</button>
      </div>

      <div class="page-toolbar" style="margin-top: 16px;">
        <div class="toolbar-filters">
          <select id="admin-requests-filter-status" aria-label="Filtrar solicitudes por estado" class="form-input form-select">
            <option value="">Todos los estados</option>
            <option value="pending" ${currentFilters.status === 'pending' ? 'selected' : ''}>Pendientes</option>
            <option value="approved" ${currentFilters.status === 'approved' ? 'selected' : ''}>Aprobadas</option>
            <option value="rejected" ${currentFilters.status === 'rejected' ? 'selected' : ''}>Rechazadas</option>
          </select>
        </div>
      </div>

      <div id="admin-requests-list" class="admin-requests-list">
        <div class="loading-state" style="padding: 48px; text-align: center;">
          <div class="loading-spinner"></div>
          <p>Cargando solicitudes...</p>
        </div>
      </div>

      <div id="request-modal" class="modal-overlay" style="display: none;">
        <div class="modal" style="max-width: 700px;">
          <div class="modal-header">
            <h3 class="modal-title" id="request-modal-title">Detalle de solicitud</h3>
            <button class="modal-close" id="close-request-modal">&times;</button>
          </div>
          <div class="modal-body" id="request-modal-body"></div>
          <div class="modal-footer" id="request-modal-footer"></div>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  loadAdminRequests();
}

function attachListeners() {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  const statusFilter = document.getElementById('admin-requests-filter-status');
  const closeModal = document.getElementById('close-request-modal');
  const modal = document.getElementById('request-modal');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      tabs.forEach(t => {
        t.classList.toggle('tab-active', t.dataset.tab === currentTab);
        t.setAttribute('aria-selected', t.dataset.tab === currentTab);
      });
      currentFilters.status = '';
      document.getElementById('admin-requests-filter-status').value = '';
      loadAdminRequests();
    });
  });

  statusFilter.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadAdminRequests();
  });

  closeModal.addEventListener('click', () => closeRequestModal());
  modal.addEventListener('click', (e) => { if (e.target === modal) closeRequestModal(); });
}

function closeRequestModal() {
  const modal = document.getElementById('request-modal');
  if (modal) modal.style.display = 'none';
}

async function loadAdminRequests() {
  const container = document.getElementById('admin-requests-list');

  container.innerHTML = `
    <div class="loading-state" style="padding: 48px; text-align: center;">
      <div class="loading-spinner"></div>
      <p>Cargando solicitudes...</p>
    </div>
  `;

  try {
    let data, error;

    if (currentTab === 'changes') {
      ({ data, error } = await adminService.getChangeRequests({ status: currentFilters.status || undefined }));
    } else {
      ({ data, error } = await adminService.getDeletionRequests({ status: currentFilters.status || undefined }));
    }

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px; text-align: center;">
          <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg></div>
          <h2 class="empty-state-title">No hay solicitudes</h2>
          <p class="empty-state-text">No se encontraron solicitudes ${currentTab === 'changes' ? 'de cambios' : 'de eliminación'} con los filtros actuales.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(req => renderRequestCard(req)).join('');
    attachRequestListeners(data);

  } catch (error) {
    console.error('Error loading admin requests:', error);
    container.innerHTML = `<div class="alert alert-error" style="padding: 24px;"><strong>Error</strong><p>${error.message}</p></div>`;
  }
}

function renderRequestCard(req) {
  const route = req.routes;
  const user = req.profiles;
  const status = req.status;
  const isChange = currentTab === 'changes';

  return `
    <article class="admin-request-card card" data-request-id="${req.id}" data-type="${currentTab}">
      <div class="request-card-header">
        <div>
          <span class="badge badge-${getRequestTypeBadgeClass(req.type)}">${getRequestTypeLabel(req.type)}</span>
          <span class="badge badge-${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
        </div>
        <span class="request-time">${formatRelativeTime(req.created_at)}</span>
      </div>

      <div class="request-card-body">
        <p class="request-reason"><strong>Motivo:</strong> ${escapeHtml(req.reason)}</p>

        ${route ? `
          <div class="request-meta">
            <div class="meta-item">
              <span class="meta-label">Ruta:</span>
              <span class="meta-value"><span class="route-badge" style="background: ${getRouteColor(route.code)}">${escapeHtml(route.code)}</span> ${escapeHtml(route.name)}</span>
            </div>
          </div>
        ` : ''}

        <div class="request-meta">
          <div class="meta-item">
            <span class="meta-label">Solicitado por:</span>
            <span class="meta-value">${escapeHtml(user?.nombre || 'Usuario')} (${escapeHtml(user?.email || 'sin email')})</span>
          </div>
        </div>

        ${isChange ? `
          <details class="request-changes">
            <summary>Ver cambios propuestos</summary>
            <div class="changes-comparison">
              <div class="change-column">
                <h5>Actual</h5>
                <pre>${escapeHtml(JSON.stringify(req.old_data, null, 2))}</pre>
              </div>
              <div class="change-column">
                <h5>Propuesto</h5>
                <pre>${escapeHtml(JSON.stringify(req.proposed_data, null, 2))}</pre>
              </div>
            </div>
          </details>
        ` : `
          <details class="request-changes">
            <summary>Ver evidencia</summary>
            <p>${escapeHtml(req.evidence) || 'Sin evidencia adjunta'}</p>
          </details>
        `}
      </div>

      ${status === 'pending' ? `
        <div class="request-card-footer">
          <button class="btn btn-success btn-sm approve-request-btn" data-request-id="${req.id}" data-type="${currentTab}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Aprobar
          </button>
          <button class="btn btn-danger btn-sm reject-request-btn" data-request-id="${req.id}" data-type="${currentTab}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            Rechazar
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

function attachRequestListeners(requests) {
  document.querySelectorAll('.approve-request-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const requestId = btn.dataset.requestId;
      const type = btn.dataset.type;
      const user = authService.getUser();

      if (!confirm(`¿Aprobar esta solicitud de ${type === 'changes' ? 'cambio' : 'eliminación'}?`)) return;

      let error;
      if (type === 'changes') {
        ({ error } = await adminService.reviewChangeRequest(requestId, 'approved', user.id));
      } else {
        ({ error } = await adminService.reviewDeletionRequest(requestId, 'approved', user.id));
      }

      if (error) toastService.error('Error al aprobar');
      else { toastService.success('Solicitud aprobada'); loadAdminRequests(); }
    });
  });

  document.querySelectorAll('.reject-request-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const requestId = btn.dataset.requestId;
      const type = btn.dataset.type;
      const user = authService.getUser();

      const reason = prompt('Motivo del rechazo (opcional):');
      if (reason === null) return;

      let error;
      if (type === 'changes') {
        ({ error } = await adminService.reviewChangeRequest(requestId, 'rejected', user.id));
      } else {
        ({ error } = await adminService.reviewDeletionRequest(requestId, 'rejected', user.id));
      }

      if (error) toastService.error('Error al rechazar');
      else { toastService.success('Solicitud rechazada'); loadAdminRequests(); }
    });
  });
}

function getRequestTypeLabel(type) {
  const labels = { fixed_change: 'Cambio permanente', temporary_change: 'Cambio temporal', route_modification: 'Modificación de ruta', stop_change: 'Cambio de parada', shape_change: 'Cambio de trayecto', other: 'Otro' };
  return labels[type] || type;
}

function getRequestTypeBadgeClass(type) {
  const classes = { fixed_change: 'warning', temporary_change: 'info', route_modification: 'primary', stop_change: 'info', shape_change: 'primary', other: 'muted' };
  return classes[type] || 'muted';
}

function getStatusLabel(status) {
  const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
  return labels[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = { pending: 'warning', approved: 'success', rejected: 'error' };
  return classes[status] || 'muted';
}

function getRouteColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
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