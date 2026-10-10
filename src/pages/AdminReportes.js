import { adminService } from '../services/admin.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

let currentFilters = { status: '', routeId: '' };
let searchDebounce = null;

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
        <h1>Gestión de reportes</h1>
        <p class="page-subtitle">Modera los reportes enviados por la comunidad</p>
      </header>

      <div class="page-toolbar">
        <div class="toolbar-filters">
          <select id="admin-reports-filter-status" class="form-input form-select">
            <option value="">Todos los estados</option>
            <option value="pending" ${currentFilters.status === 'pending' ? 'selected' : ''}>Pendientes</option>
            <option value="confirmed" ${currentFilters.status === 'confirmed' ? 'selected' : ''}>Confirmados</option>
            <option value="rejected" ${currentFilters.status === 'rejected' ? 'selected' : ''}>Rechazados</option>
            <option value="resolved" ${currentFilters.status === 'resolved' ? 'selected' : ''}>Resueltos</option>
            <option value="expired" ${currentFilters.status === 'expired' ? 'selected' : ''}>Expirados</option>
          </select>
        </div>
      </div>

      <div id="admin-reports-list" class="admin-reports-list">
        <div class="loading-state" style="padding: 48px; text-align: center;">
          <div class="loading-spinner"></div>
          <p>Cargando reportes...</p>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  loadAdminReports();
}

function attachListeners() {
  const statusFilter = document.getElementById('admin-reports-filter-status');
  statusFilter.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadAdminReports();
  });
}

async function loadAdminReports() {
  const container = document.getElementById('admin-reports-list');

  container.innerHTML = `
    <div class="loading-state" style="padding: 48px; text-align: center;">
      <div class="loading-spinner"></div>
      <p>Cargando reportes...</p>
    </div>
  `;

  try {
    const { data: reports, error } = await adminService.getReports({
      status: currentFilters.status || undefined,
      routeId: currentFilters.routeId || undefined
    });

    if (error) throw error;

    if (!reports || reports.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px; text-align: center;">
          <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg></div>
          <h2 class="empty-state-title">No hay reportes</h2>
          <p class="empty-state-text">No se encontraron reportes con los filtros actuales.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = reports.map(report => renderAdminReportCard(report)).join('');
    attachReportListeners(reports);

  } catch (error) {
    console.error('Error loading admin reports:', error);
    container.innerHTML = `
      <div class="alert alert-error" style="padding: 24px;">
        <strong>Error al cargar reportes</strong>
        <p>${error.message}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top: 8px;" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

function renderAdminReportCard(report) {
  const user = report.profiles;
  const route = report.routes;
  const status = report.status;

  return `
    <article class="admin-report-card card" data-report-id="${report.id}">
      <div class="report-card-header">
        <div>
          <span class="badge badge-${getReportTypeBadgeClass(report.type)}">${getReportTypeLabel(report.type)}</span>
          <span class="badge badge-${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
        </div>
        <span class="report-time">${formatRelativeTime(report.created_at)}</span>
      </div>

      <div class="report-card-body">
        <p class="report-description">${report.description}</p>

        <div class="report-meta">
          ${route ? `
            <div class="meta-item">
              <span class="meta-label">Ruta:</span>
              <span class="meta-value"><span class="route-badge" style="background: ${getRouteColor(route.code)}">${route.code}</span> ${route.name}</span>
            </div>
          ` : ''}
          <div class="meta-item">
            <span class="meta-label">Reportado por:</span>
            <span class="meta-value">${user?.nombre || 'Usuario'} (${user?.email || 'sin email'})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Ubicación:</span>
            <span class="meta-value">${report.location?.coordinates ? `${report.location.coordinates[1].toFixed(6)}, ${report.location.coordinates[0].toFixed(6)}` : 'No especificada'}</span>
          </div>
        </div>

        ${report.evidence ? `
          <div class="report-evidence">
            <a href="${report.evidence}" target="_blank" class="btn btn-ghost btn-sm">Ver evidencia</a>
          </div>
        ` : ''}
      </div>

      ${status === 'pending' ? `
        <div class="report-card-footer">
          <button class="btn btn-success btn-sm confirm-report-btn" data-report-id="${report.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Confirmar
          </button>
          <button class="btn btn-error btn-sm reject-report-btn" data-report-id="${report.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            Rechazar
          </button>
        </div>
      ` : status === 'confirmed' ? `
        <div class="report-card-footer">
          <button class="btn btn-secondary btn-sm resolve-report-btn" data-report-id="${report.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Marcar como resuelto
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

function attachReportListeners(reports) {
  document.querySelectorAll('.confirm-report-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reportId = btn.dataset.reportId;
      const user = authService.getUser();
      const { error } = await adminService.moderateReport(reportId, 'confirmed', user.id);
      if (error) toastService.error('Error al confirmar');
      else { toastService.success('Reporte confirmado'); loadAdminReports(); }
    });
  });

  document.querySelectorAll('.reject-report-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reportId = btn.dataset.reportId;
      const reason = prompt('Motivo del rechazo (opcional):');
      const user = authService.getUser();
      const { error } = await adminService.moderateReport(reportId, 'rejected', user.id);
      if (error) toastService.error('Error al rechazar');
      else { toastService.success('Reporte rechazado'); loadAdminReports(); }
    });
  });

  document.querySelectorAll('.resolve-report-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reportId = btn.dataset.reportId;
      const user = authService.getUser();
      const { error } = await adminService.moderateReport(reportId, 'resolved', user.id);
      if (error) toastService.error('Error al resolver');
      else { toastService.success('Reporte marcado como resuelto'); loadAdminReports(); }
    });
  });
}

function getReportTypeLabel(type) {
  const labels = { accident: 'Accidente', traffic: 'Tráfico intenso', breakdown: 'Bus averiado', no_show: 'Bus no pasó', suspended: 'Ruta suspendida', detour: 'Desvío', incorrect_info: 'Información incorrecta', incorrect_stop: 'Parada incorrecta', incorrect_route: 'Ruta incorrecta', incorrect_eta: 'ETA incorrecto', other: 'Otro' };
  return labels[type] || type;
}

function getReportTypeBadgeClass(type) {
  const classes = { accident: 'error', traffic: 'warning', breakdown: 'info', no_show: 'warning', suspended: 'error', detour: 'info', incorrect_info: 'muted', incorrect_stop: 'muted', incorrect_route: 'muted', incorrect_eta: 'muted', other: 'muted' };
  return classes[type] || 'muted';
}

function getStatusLabel(status) {
  const labels = { pending: 'Pendiente', confirmed: 'Confirmado', rejected: 'Rechazado', expired: 'Expirado', resolved: 'Resuelto' };
  return labels[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = { pending: 'warning', confirmed: 'info', rejected: 'error', expired: 'muted', resolved: 'success' };
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