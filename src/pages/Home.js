import { authService } from '../services/auth.js';
import { routeService } from '../services/routes.js';
import { stopService } from '../services/stops.js';
import { reportService } from '../services/reports.js';
import { favoriteService } from '../services/favorites.js';
import { geolocationService, GEOLOCATION_EVENTS } from '../services/geolocation.js';
import { eventBus } from '../utils/eventBus.js';
import { router } from '../utils/router.js';
import { toastService } from '../services/toast.js';

export async function renderPage(container, route) {
  const user = authService.getUser();
  const isAuth = authService.isAuthenticated();

  container.innerHTML = `
    <div class="home-page">
      <section class="home-hero">
        <div class="hero-content">
          <h1>bus-in-live</h1>
          <p class="hero-subtitle">Transporte público colaborativo en Santa Ana, El Salvador</p>
          <p class="hero-description">
            Consulta dónde está tu bus, cuándo podría llegar y reporta problemas en tiempo real con ayuda de la comunidad.
          </p>
          <div class="hero-actions">
            <a href="/mapa" class="btn btn-primary btn-lg" data-link>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
              Ver mapa
            </a>
            <a href="/rutas" class="btn btn-secondary btn-lg" data-link>Buscar rutas</a>
          </div>
        </div>
      </section>

      ${isAuth ? renderUserSection(user) : renderGuestSection()}

      <section class="home-section">
        <div class="section-header">
          <h2>Enlaces útiles</h2>
        </div>
        <div class="links-grid">
          <a href="/privacidad" class="link-card" data-link>
            <div class="link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3>Privacidad y GPS</h3>
            <p>Controla cómo se usa tu ubicación y configura el seguimiento.</p>
          </a>
          <a href="/terminos" class="link-card" data-link>
            <div class="link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h3>Términos y condiciones</h3>
            <p>Conoce los términos de uso y la política de privacidad.</p>
          </a>
          <a href="/acerca" class="link-card" data-link>
            <div class="link-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>
            <h3>Acerca del proyecto</h3>
            <p>Misión, visión y cómo funciona bus-in-live.</p>
          </a>
        </div>
      </section>

      <footer class="home-footer">
        <p>bus-in-live &mdash; Proyecto comunitario para Santa Ana, El Salvador</p>
        <p class="footer-note">La información mostrada es colaborativa y estimada. No garantizamos exactitud.</p>
      </footer>
    </div>
  `;

  if (isAuth) {
    attachUserSectionListeners();
    loadUserData();
  } else {
    attachGuestSectionListeners();
  }

  attachQuickActionListeners();
}

function renderGuestSection() {
  return `
    <section class="home-section home-cta">
      <div class="cta-card">
        <div class="cta-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2>Únete a la comunidad</h2>
        <p>Regístrate para reportar problemas, guardar favoritos, compartir tu viaje y ayudar a mejorar la información para todos.</p>
        <div class="cta-actions">
          <a href="/register" class="btn btn-primary btn-lg" data-link>Crear cuenta gratis</a>
          <a href="/login" class="btn btn-secondary btn-lg" data-link>Iniciar sesión</a>
        </div>
      </div>
    </section>
  `;
}

function renderUserSection(user) {
  return `
    <section class="home-section">
      <div class="section-header">
        <h2>Accesos rápidos</h2>
      </div>
      <div class="quick-actions" id="quick-actions">
        <a href="/paradas-cercanas" class="quick-action" data-quick-action="nearby-stops" data-link>
          <div class="quick-action-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <div class="quick-action-content">
            <h3>Paradas cercanas</h3>
            <p>Encuentra paradas cerca de ti y ve qué rutas pasan</p>
          </div>
        </a>
        <a href="/viajar" class="quick-action" data-quick-action="start-trip" data-link>
          <div class="quick-action-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
          </div>
          <div class="quick-action-content">
            <h3>Estoy viajando</h3>
            <p>Comparte tu ubicación para ayudar a estimar llegadas</p>
          </div>
        </a>
        <a href="/reportar" class="quick-action" data-quick-action="report" data-link>
          <div class="quick-action-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div class="quick-action-content">
            <h3>Reportar problema</h3>
            <p>Accidente, bus averiado, desviación, tráfico, etc.</p>
          </div>
        </a>
        <a href="/rutas/crear" class="quick-action" data-quick-action="create-route" data-link>
          <div class="quick-action-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="quick-action-content">
            <h3>Agregar ruta</h3>
            <p>Dibuja una ruta que conozcas en el mapa</p>
          </div>
        </a>
      </div>
    </section>

    <section class="home-section" id="favorites-section" style="display: none;">
      <div class="section-header">
        <div>
          <h2>Tus favoritos</h2>
          <a href="/favoritos" class="section-link" data-link>Ver todos</a>
        </div>
      </div>
      <div class="favorites-list" id="favorites-list"></div>
    </section>

    <section class="home-section" id="recent-routes-section" style="display: none;">
      <div class="section-header">
        <div>
          <h2>Rutas recientes</h2>
          <a href="/historial" class="section-link" data-link>Ver todo</a>
        </div>
      </div>
      <div class="recent-routes-list" id="recent-routes-list"></div>
    </section>
  `;
}

function attachGuestSectionListeners() {
  // No additional listeners needed for guest section
}

function attachUserSectionListeners() {
  // Quick actions are handled by router via data-link
}

function attachQuickActionListeners() {
  // Handled by router
}

async function loadUserData() {
  try {
    const [favorites, recentRoutes] = await Promise.all([
      favoriteService.getUserFavorites(),
      loadRecentRoutes()
    ]);

    renderFavorites(favorites);
    renderRecentRoutes(recentRoutes);
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

async function loadRecentRoutes() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const user = authService.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('search_history')
    .select('reference_id, search_type, created_at')
    .eq('user_id', user.id)
    .eq('search_type', 'route')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return [];

  const routeIds = [...new Set(data.map(d => d.reference_id))];
  const { data: routes } = await supabase
    .from('routes')
    .select('id, code, name, origin, destination, type')
    .in('id', routeIds);

  return routes || [];
}

function renderFavorites(favorites) {
  const container = document.getElementById('favorites-list');
  const section = document.getElementById('favorites-section');

  if (!container || !section) return;

  if (favorites.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = favorites.slice(0, 4).map(fav => `
    <a href="${fav.route_id ? `/rutas/${fav.route_id}` : `/paradas/${fav.stop_id}`}" class="favorite-item" data-link>
      <div class="favorite-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${fav.route_id ? '<path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><circle cx="10" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>' : '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'}
        </svg>
      </div>
      <div class="favorite-info">
        <h4>${fav.route_id ? `Ruta ${fav.route_code || ''} ${fav.route_name || ''}`.trim() : `Parada: ${fav.stop_name || ''}`}</h4>
        <p class="favorite-meta">${fav.route_id ? `${fav.route_origin || ''} → ${fav.route_destination || ''}` : ''}</p>
      </div>
    </a>
  `).join('');
}

function renderRecentRoutes(routes) {
  const container = document.getElementById('recent-routes-list');
  const section = document.getElementById('recent-routes-section');

  if (!container || !section) return;

  if (routes.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = routes.slice(0, 4).map(route => `
    <a href="/rutas/${route.id}" class="recent-route-item" data-link>
      <div class="recent-route-badge">${route.code}</div>
      <div class="recent-route-info">
        <h4>${route.name}</h4>
        <p class="recent-route-meta">${route.origin} → ${route.destination}</p>
      </div>
    </a>
  `).join('');
}