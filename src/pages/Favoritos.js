import { favoriteService } from '../services/favorites.js';
import { toastService } from '../services/toast.js';
import { escapeHtml, escapeAttr } from '../utils/sanitize.js';

export async function renderPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <header class="page-header">
        <h1>Mis favoritos</h1>
        <p class="page-subtitle">Rutas y paradas que guardaste</p>
      </header>

      <div id="favorites-loading" class="empty-state">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Cargando favoritos...</p>
      </div>

      <div id="favorites-empty" class="empty-state" style="display: none;">
        <div class="empty-state-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        <h2 class="empty-state-title">No tienes favoritos aún</h2>
        <p class="empty-state-text">Guarda rutas y paradas frecuentes para encontrarlas rápido.</p>
        <a href="/rutas" class="btn btn-primary" style="margin-top: var(--spacing-4);" data-link>Explorar rutas</a>
      </div>

      <div id="favorites-list" style="display: none;"></div>
    </div>
  `;

  await loadFavorites();
}

async function loadFavorites() {
  const loading = document.getElementById('favorites-loading');
  const empty = document.getElementById('favorites-empty');
  const list = document.getElementById('favorites-list');

  const { data: favorites, error } = await favoriteService.getUserFavorites();

  loading.style.display = 'none';

  if (error) {
    console.error('Error loading favorites:', error);
    toastService.error('No se pudieron cargar tus favoritos');
    empty.style.display = 'block';
    return;
  }

  if (!favorites || favorites.length === 0) {
    empty.style.display = 'block';
    return;
  }

  const routes = favorites.filter(f => f.routes);
  const stops = favorites.filter(f => f.stops);

  list.innerHTML = `
    ${routes.length ? `
      <h2 style="font-size: var(--text-lg); margin-bottom: var(--spacing-4);">Rutas</h2>
      <div class="favorites-section" style="display: grid; gap: var(--spacing-3); margin-bottom: var(--spacing-6);">
        ${routes.map(f => `
          <div class="card favorite-item" data-fav-id="${f.id}" data-route-id="${f.route_id || ''}" data-stop-id="${f.stop_id || ''}">
            <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: var(--spacing-3); min-width: 0; flex: 1;">
                <span class="route-badge" style="background: var(--primary-action); color: #fff;">${escapeHtml(f.routes.code || '—')}</span>
                <div style="min-width: 0;">
                  <a href="/rutas/${f.routes.id}" data-link style="font-weight: 600; display: block;">${escapeHtml(f.routes.name || 'Ruta sin nombre')}</a>
                  <span style="color: var(--text-secondary); font-size: var(--text-sm);">${escapeHtml(f.routes.origin || '')} → ${escapeHtml(f.routes.destination || '')}</span>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm remove-favorite-btn" data-route-id="${f.route_id || ''}" data-stop-id="${f.stop_id || ''}" aria-label="Quitar ${escapeAttr(f.routes.name || 'ruta')} de favoritos">Quitar</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${stops.length ? `
      <h2 style="font-size: var(--text-lg); margin-bottom: var(--spacing-4);">Paradas</h2>
      <div class="favorites-section" style="display: grid; gap: var(--spacing-3);">
        ${stops.map(f => `
          <div class="card favorite-item" data-fav-id="${f.id}" data-route-id="${f.route_id || ''}" data-stop-id="${f.stop_id || ''}">
            <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: var(--spacing-3); min-width: 0; flex: 1;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0; color: var(--link);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <div style="min-width: 0;">
                  <a href="/paradas/${f.stops.id}" data-link style="font-weight: 600; display: block;">${escapeHtml(f.stops.name || 'Parada sin nombre')}</a>
                  <span style="color: var(--text-secondary); font-size: var(--text-sm);">${escapeHtml(f.stops.stop_type || 'Parada')}</span>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm remove-favorite-btn" data-route-id="${f.route_id || ''}" data-stop-id="${f.stop_id || ''}" aria-label="Quitar ${escapeAttr(f.stops.name || 'parada')} de favoritos">Quitar</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  list.style.display = 'block';

  list.querySelectorAll('.remove-favorite-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const routeId = btn.dataset.routeId || null;
      const stopId = btn.dataset.stopId || null;
      btn.disabled = true;
      btn.textContent = 'Quitando...';
      try {
        const { error } = await favoriteService.removeFavorite(routeId, stopId);
        if (error) throw error;
        const card = btn.closest('.favorite-item');
        card.remove();
        toastService.success('Eliminado de favoritos');
        // Si no queda nada, mostrar estado vacío
        if (!list.querySelector('.favorite-item')) {
          list.style.display = 'none';
          document.getElementById('favorites-empty').style.display = 'block';
        }
      } catch (error) {
        console.error('Error removing favorite:', error);
        toastService.error('No se pudo quitar el favorito');
        btn.disabled = false;
        btn.textContent = 'Quitar';
      }
    });
  });
}
