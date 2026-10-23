import { tripSessionService } from '../services/tripSession.js';
import { toastService } from '../services/toast.js';
import { escapeHtml } from '../utils/sanitize.js';

export async function renderPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Historial de viajes</h1>
        <p class="page-subtitle">Viajes donde compartiste tu ubicación para ayudar a la comunidad</p>
      </header>

      <div id="history-loading" class="empty-state">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Cargando historial...</p>
      </div>

      <div id="history-empty" class="empty-state" style="display: none;">
        <div class="empty-state-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h2 class="empty-state-title">Aún no tienes viajes</h2>
        <p class="empty-state-text">Cuando actives "Estoy viajando", tus viajes aparecerán aquí.</p>
        <a href="/viajar" class="btn btn-primary" style="margin-top: var(--spacing-4);" data-link>Compartir mi primer viaje</a>
      </div>

      <div id="history-list" style="display: none;"></div>
    </div>
  `;

  await loadHistory();
}

async function loadHistory() {
  const loading = document.getElementById('history-loading');
  const empty = document.getElementById('history-empty');
  const list = document.getElementById('history-list');

  const { data: trips, error } = await tripSessionService.getHistory();

  loading.style.display = 'none';

  if (error) {
    console.error('Error loading trip history:', error);
    toastService.error('No se pudo cargar tu historial de viajes');
    empty.style.display = 'block';
    return;
  }

  if (!trips || trips.length === 0) {
    empty.style.display = 'block';
    return;
  }

  list.innerHTML = `
    <div class="favorites-section" style="display: grid; gap: var(--spacing-3);">
      ${trips.map(trip => {
        const route = trip.routes;
        const variant = trip.route_variants;
        const isActive = trip.status === 'active' && !trip.ended_at;
        const status = trip.status === 'completed' ? 'Completado' : isActive ? 'En curso' : 'Pausado';
        const statusClass = isActive ? 'success' : trip.status === 'completed' ? 'muted' : 'warning';
        return `
          <div class="card">
            <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: var(--spacing-3); min-width: 0; flex: 1;">
                <span class="route-badge" style="background: var(--primary-action); color: #fff;">${escapeHtml(route?.code || '—')}</span>
                <div style="min-width: 0;">
                  ${route ? `<a href="/rutas/${route.id}" data-link style="font-weight: 600; display: block;">${escapeHtml(route.name)}</a>` : '<span style="font-weight: 600; display: block;">Ruta eliminada</span>'}
                  <span style="color: var(--text-secondary); font-size: var(--text-sm);">
                    ${escapeHtml(formatDateTime(trip.started_at))}
                    ${variant ? ` · ${escapeHtml(variant.name)}${variant.direct ? ' (directo)' : ''}` : ''}
                  </span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: var(--spacing-3); flex-shrink: 0;">
                <span style="color: var(--text-secondary); font-size: var(--text-sm);">${escapeHtml(formatDuration(trip.started_at, trip.ended_at))}</span>
                <span class="badge badge-${statusClass}">${status}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  list.style.display = 'block';
}

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  return date.toLocaleString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDuration(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '—';

  const totalMinutes = Math.round((end - start) / 60000);
  if (totalMinutes < 1) return 'Menos de 1 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}
