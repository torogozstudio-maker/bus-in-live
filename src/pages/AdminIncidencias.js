import { adminService } from '../services/admin.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';
import { getCurrentCity } from '../config/city.js';
import { escapeHtml } from '../utils/sanitize.js';

let currentFilters = { status: '', routeId: '' };

export async function renderPage(container) {
  if (!authService.isAdmin()) {
    router.navigate('/');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('status')) currentFilters.status = urlParams.get('status');
  if (urlParams.get('route')) currentFilters.routeId = urlParams.get('route');

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Gestión de incidencias</h1>
        <p class="page-subtitle">Administra las incidencias activas en la red de transporte</p>
      </header>

      <div class="page-toolbar">
        <div class="toolbar-filters">
          <select id="admin-incidents-filter-status" aria-label="Filtrar incidencias por estado" class="form-input form-select">
            <option value="">Todas</option>
            <option value="active" ${currentFilters.status === 'active' ? 'selected' : ''}>Activas</option>
            <option value="resolved" ${currentFilters.status === 'resolved' ? 'selected' : ''}>Resueltas</option>
            <option value="expired" ${currentFilters.status === 'expired' ? 'selected' : ''}>Expiradas</option>
          </select>
        </div>
        <button class="btn btn-primary" id="create-incident-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva incidencia
        </button>
      </div>

      <div id="admin-incidents-list" class="admin-incidents-list">
        <div class="loading-state" style="padding: 48px; text-align: center;">
          <div class="loading-spinner"></div>
          <p>Cargando incidencias...</p>
        </div>
      </div>

      <div id="incident-modal" class="modal-overlay" style="display: none;">
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title" id="incident-modal-title">Nueva incidencia</h3>
            <button class="modal-close" id="close-incident-modal">&times;</button>
          </div>
          <form id="incident-form" class="modal-body">
            <div class="form-group">
              <label for="incident-route" class="form-label">Ruta afectada *</label>
              <select id="incident-route" class="form-input form-select" required>
                <option value="">Seleccionar ruta</option>
              </select>
            </div>
            <div class="form-group">
              <label for="incident-variant" class="form-label">Variante (opcional)</label>
              <select id="incident-variant" class="form-input form-select">
                <option value="">Todas las variantes</option>
              </select>
            </div>
            <div class="form-group">
              <label for="incident-type" class="form-label">Tipo *</label>
              <select id="incident-type" class="form-input form-select" required>
                <option value="accident">Accidente</option>
                <option value="traffic">Tráfico intenso</option>
                <option value="breakdown">Bus averiado</option>
                <option value="blockage">Bloqueo</option>
                <option value="detour">Desvío</option>
                <option value="suspended">Servicio suspendido</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label for="incident-severity" class="form-label">Severidad *</label>
              <select id="incident-severity" class="form-input form-select" required>
                <option value="low">Baja</option>
                <option value="medium" selected>Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div class="form-group">
              <label for="incident-description" class="form-label">Descripción *</label>
              <textarea id="incident-description" class="form-input" rows="3" required placeholder="Describe la incidencia..."></textarea>
            </div>
            <div class="form-group">
              <label for="incident-expires" class="form-label">Expiración (opcional)</label>
              <input type="datetime-local" id="incident-expires" class="form-input form-select">
              <p class="form-hint">Si no se especifica, la incidencia no expira automáticamente</p>
            </div>
          </form>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-incident-btn">Cancelar</button>
            <button type="submit" form="incident-form" class="btn btn-primary" id="save-incident-btn">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  loadAdminIncidents();
  loadRoutesForIncidentSelect();
}

function attachListeners() {
  const statusFilter = document.getElementById('admin-incidents-filter-status');
  const createBtn = document.getElementById('create-incident-btn');
  const modal = document.getElementById('incident-modal');
  const closeModal = document.getElementById('close-incident-modal');
  const cancelBtn = document.getElementById('cancel-incident-btn');
  const form = document.getElementById('incident-form');
  const routeSelect = document.getElementById('incident-route');
  const saveBtn = document.getElementById('save-incident-btn');

  statusFilter.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadAdminIncidents();
  });

  createBtn.addEventListener('click', () => openIncidentModal());
  closeModal.addEventListener('click', () => closeIncidentModal());
  cancelBtn.addEventListener('click', () => closeIncidentModal());
  modal.addEventListener('click', (e) => { if (e.target === modal) closeIncidentModal(); });

  routeSelect.addEventListener('change', async () => {
    const routeId = routeSelect.value;
    const variantSelect = document.getElementById('incident-variant');
    variantSelect.innerHTML = '<option value="">Todas las variantes</option>';
    if (routeId) {
      const { data: route } = await (await import('../services/routes.js')).routeService.getRouteById(routeId);
      if (route?.route_variants) {
        route.route_variants.filter(v => v.active).forEach(v => {
          variantSelect.innerHTML += `<option value="${v.id}">${escapeHtml(v.name)} (${v.direct ? 'Directo' : 'No directo'})</option>`;
        });
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveIncident();
  });
}

async function loadRoutesForIncidentSelect() {
  const { data: routes } = await (await import('../services/routes.js')).routeService.getRoutes({ city: getCurrentCity(), status: 'normal' });
  const routeSelect = document.getElementById('incident-route');
  routes?.forEach(route => {
    routeSelect.innerHTML += `<option value="${route.id}">${escapeHtml(route.code)} - ${escapeHtml(route.name)}</option>`;
  });
}

function openIncidentModal(incident = null) {
  const modal = document.getElementById('incident-modal');
  const title = document.getElementById('incident-modal-title');
  const form = document.getElementById('incident-form');
  const saveBtn = document.getElementById('save-incident-btn');

  form.reset();
  title.textContent = incident ? 'Editar incidencia' : 'Nueva incidencia';
  saveBtn.textContent = incident ? 'Actualizar' : 'Crear';
  form.dataset.incidentId = incident?.id || '';

  if (incident) {
    document.getElementById('incident-route').value = incident.route_id || '';
    document.getElementById('incident-variant').value = incident.variant_id || '';
    document.getElementById('incident-type').value = incident.type;
    document.getElementById('incident-severity').value = incident.severity || 'medium';
    document.getElementById('incident-description').value = incident.description || '';
    if (incident.expires_at) {
      document.getElementById('incident-expires').value = incident.expires_at.slice(0, 16);
    }
  }

  modal.style.display = 'flex';
}

function closeIncidentModal() {
  document.getElementById('incident-modal').style.display = 'none';
}

async function saveIncident() {
  const form = document.getElementById('incident-form');
  const incidentId = form.dataset.incidentId;
  const isEdit = !!incidentId;

  const data = {
    route_id: document.getElementById('incident-route').value,
    variant_id: document.getElementById('incident-variant').value || null,
    type: document.getElementById('incident-type').value,
    severity: document.getElementById('incident-severity').value,
    description: document.getElementById('incident-description').value,
    expires_at: document.getElementById('incident-expires').value || null
  };

  if (!data.route_id || !data.description) {
    toastService.error('Completa los campos obligatorios');
    return;
  }

  try {
    if (isEdit) {
      await adminService.updateIncident(incidentId, data);
      toastService.success('Incidencia actualizada');
    } else {
      await adminService.createIncident(data);
      toastService.success('Incidencia creada');
    }
    closeIncidentModal();
    loadAdminIncidents();
  } catch (error) {
    console.error('Error saving incident:', error);
    toastService.error('Error al guardar la incidencia');
  }
}

async function loadAdminIncidents() {
  const container = document.getElementById('admin-incidents-list');

  container.innerHTML = `
    <div class="loading-state" style="padding: 48px; text-align: center;">
      <div class="loading-spinner"></div>
      <p>Cargando incidencias...</p>
    </div>
  `;

  try {
    const { data: incidents, error } = await adminService.getIncidents({
      status: currentFilters.status || undefined,
      routeId: currentFilters.routeId || undefined
    });

    if (error) throw error;

    if (!incidents || incidents.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px; text-align: center;">
          <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line></svg></div>
          <h2 class="empty-state-title">No hay incidencias</h2>
        </div>
      `;
      return;
    }

    container.innerHTML = incidents.map(inc => renderAdminIncidentCard(inc)).join('');
    attachIncidentListeners(incidents);

  } catch (error) {
    console.error('Error loading admin incidents:', error);
    container.innerHTML = `<div class="alert alert-error" style="padding: 24px;"><strong>Error</strong><p>${error.message}</p></div>`;
  }
}

function renderAdminIncidentCard(incident) {
  const route = incident.routes;
  const variant = incident.route_variants;
  const status = incident.status;
  const severity = incident.severity;
  const now = new Date();
  const expires = incident.expires_at ? new Date(incident.expires_at) : null;
  const isExpired = expires && expires < now;

  return `
    <article class="admin-incident-card card" data-incident-id="${incident.id}">
      <div class="incident-card-header">
        <div>
          <span class="badge badge-${getTypeBadgeClass(incident.type)}">${getIncidentTypeLabel(incident.type)}</span>
          <span class="badge badge-${getSeverityBadgeClass(severity)}">${escapeHtml(severity)}</span>
          <span class="badge badge-${getIncidentStatusBadgeClass(status)}${isExpired ? ' expired' : ''}">${getIncidentStatusLabel(status)}${isExpired ? ' (Expirada)' : ''}</span>
        </div>
        <span class="incident-time">${formatRelativeTime(incident.created_at)}</span>
      </div>

      <div class="incident-card-body">
        <p class="incident-description">${escapeHtml(incident.description)}</p>

        <div class="incident-meta">
          ${route ? `
            <div class="meta-item">
              <span class="meta-label">Ruta:</span>
              <span class="meta-value"><span class="route-badge" style="background: ${getRouteColor(route.code)}">${escapeHtml(route.code)}</span> ${escapeHtml(route.name)}</span>
            </div>
          ` : ''}
          ${variant ? `
            <div class="meta-item">
              <span class="meta-label">Variante:</span>
              <span class="meta-value">${escapeHtml(variant.name)}</span>
            </div>
          ` : ''}
          <div class="meta-item">
            <span class="meta-label">Creada:</span>
            <span class="meta-value">${new Date(incident.created_at).toLocaleString('es-ES')}</span>
          </div>
          ${expires ? `
            <div class="meta-item">
              <span class="meta-label">Expira:</span>
              <span class="meta-value ${isExpired ? 'expired' : ''}">${expires.toLocaleString('es-ES')}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="incident-card-footer">
        <button class="btn btn-secondary btn-sm edit-incident-btn" data-incident-id="${incident.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path></svg>
          Editar
        </button>
        ${status === 'active' && !isExpired ? `
          <button class="btn btn-warning btn-sm expire-incident-btn" data-incident-id="${incident.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Expirar
          </button>
          <button class="btn btn-success btn-sm resolve-incident-btn" data-incident-id="${incident.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Resolver
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

function attachIncidentListeners(incidents) {
  document.querySelectorAll('.edit-incident-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const incident = incidents.find(i => i.id === btn.dataset.incidentId);
      if (incident) openIncidentModal(incident);
    });
  });

  document.querySelectorAll('.expire-incident-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Marcar esta incidencia como expirada?')) return;
      const { error } = await adminService.expireIncident(btn.dataset.incidentId);
      if (error) toastService.error('Error al expirar');
      else { toastService.success('Incidencia expirada'); loadAdminIncidents(); }
    });
  });

  document.querySelectorAll('.resolve-incident-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Marcar esta incidencia como resuelta?')) return;
      const { error } = await adminService.resolveIncident(btn.dataset.incidentId);
      if (error) toastService.error('Error al resolver');
      else { toastService.success('Incidencia resuelta'); loadAdminIncidents(); }
    });
  });
}

function getIncidentTypeLabel(type) {
  const labels = { accident: 'Accidente', traffic: 'Tráfico', breakdown: 'Avería', blockage: 'Bloqueo', detour: 'Desvío', suspended: 'Suspendido', other: 'Otro' };
  return labels[type] || type;
}

function getTypeBadgeClass(type) {
  const classes = { accident: 'error', traffic: 'warning', breakdown: 'info', blockage: 'error', detour: 'info', suspended: 'error', other: 'muted' };
  return classes[type] || 'muted';
}

function getSeverityBadgeClass(severity) {
  const classes = { low: 'info', medium: 'warning', high: 'error', critical: 'error' };
  return classes[severity] || 'muted';
}

function getIncidentStatusLabel(status) {
  const labels = { active: 'Activa', resolved: 'Resuelta', expired: 'Expirada' };
  return labels[status] || status;
}

function getIncidentStatusBadgeClass(status) {
  const classes = { active: 'info', resolved: 'success', expired: 'muted' };
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