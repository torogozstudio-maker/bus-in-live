import { adminService } from '../services/admin.js';
import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container) {
  if (!authService.isAdmin()) {
    router.navigate('/');
    return;
  }

  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Panel de administración</h1>
        <p class="page-subtitle">Gestión y moderación de bus-in-live</p>
      </header>

      <div class="admin-stats-grid" id="stats-grid">
        <div class="card stat-card loading">
          <div class="stat-icon" style="background: var(--primary-soft); color: var(--primary);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><circle cx="10" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">--</div>
            <div class="stat-label">Rutas activas</div>
          </div>
        </div>
        <div class="card stat-card loading">
          <div class="stat-icon" style="background: var(--warning-soft); color: var(--warning);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">--</div>
            <div class="stat-label">Rutas pendientes</div>
          </div>
        </div>
        <div class="card stat-card loading">
          <div class="stat-icon" style="background: var(--error-soft); color: var(--error);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">--</div>
            <div class="stat-label">Reportes abiertos</div>
          </div>
        </div>
        <div class="card stat-card loading">
          <div class="stat-icon" style="background: var(--info-soft); color: var(--info);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">--</div>
            <div class="stat-label">Incidencias activas</div>
          </div>
        </div>
        <div class="card stat-card loading">
          <div class="stat-icon" style="background: var(--success-soft); color: var(--success);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">--</div>
            <div class="stat-label">Observaciones (1h)</div>
          </div>
        </div>
        <div class="card stat-card loading">
          <div class="stat-icon" style="background: var(--muted); color: var(--text);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">--</div>
            <div class="stat-label">Usuarios totales</div>
          </div>
        </div>
      </div>

      <div class="admin-quick-actions">
        <a href="/admin/rutas" class="btn btn-primary" data-link>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path></svg>
          Gestionar rutas
        </a>
        <a href="/admin/reportes" class="btn btn-secondary" data-link>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
          Moderar reportes
        </a>
        <a href="/admin/incidencias" class="btn btn-secondary" data-link>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Gestionar incidencias
        </a>
        <a href="/admin/solicitudes" class="btn btn-secondary" data-link>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Solicitudes de cambios
        </a>
      </div>

      <div class="admin-section">
        <div class="section-header">
          <h2>Accesos rápidos</h2>
        </div>
        <div class="admin-links-grid">
          <a href="/admin/rutas?status=pending" class="admin-link-card" data-link>
            <div class="admin-link-icon" style="background: var(--warning-soft); color: var(--warning);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <h3>Rutas pendientes de aprobación</h3>
            <p>Revisa las rutas creadas por la comunidad</p>
          </a>
          <a href="/admin/reportes?status=pending" class="admin-link-card" data-link>
            <div class="admin-link-icon" style="background: var(--error-soft); color: var(--error);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            </div>
            <h3>Reportes pendientes</h3>
            <p>Modera los reportes de la comunidad</p>
          </a>
          <a href="/admin/incidencias?status=active" class="admin-link-card" data-link>
            <div class="admin-link-icon" style="background: var(--info-soft); color: var(--info);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line></svg>
            </div>
            <h3>Incidencias activas</h3>
            <p>Gestiona incidencias en tiempo real</p>
          </a>
          <a href="/admin/solicitudes?status=pending" class="admin-link-card" data-link>
            <div class="admin-link-icon" style="background: var(--primary-soft); color: var(--primary);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path></svg>
            </div>
            <h3>Solicitudes de cambios</h3>
            <p>Aprueba o rechaza modificaciones de rutas</p>
          </a>
        </div>
      </div>
    </div>
  `;

  loadDashboardStats();
}

async function loadDashboardStats() {
  const { data, error } = await adminService.getDashboardStats();

  if (error || !data) {
    toastService.error('Error al cargar estadísticas');
    return;
  }

  const statCards = document.querySelectorAll('#stats-grid .stat-card');
  const values = [
    data.activeRoutes,
    data.pendingRoutes,
    data.openReports,
    data.activeIncidents,
    data.recentObservations,
    data.totalUsers
  ];

  statCards.forEach((card, i) => {
    card.classList.remove('loading');
    card.querySelector('.stat-value').textContent = values[i] || 0;
  });
}