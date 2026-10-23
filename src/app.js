import { authService, AUTH_EVENTS } from './services/auth.js';
import { router } from './utils/router.js';
import { eventBus } from './utils/eventBus.js';
import { toastService, TOAST_EVENTS } from './services/toast.js';
import { geolocationService } from './services/geolocation.js';
import { tripSessionService } from './services/tripSession.js';
import { renderHeader } from './components/Header.js';
import { renderBottomNav } from './components/BottomNav.js';
import { renderSidebar } from './components/Sidebar.js';
import { themeService } from './services/theme.js';
import { routeService } from './services/routes.js';
import { stopService } from './services/stops.js';
import { getCurrentCity } from './config/city.js';
import { escapeHtml } from './utils/sanitize.js';

let appContainer = null;
let isMobile = false;

function detectMobile() {
  isMobile = window.innerWidth < 768;
  document.body.classList.toggle('mobile', isMobile);
  document.body.classList.toggle('desktop', !isMobile);
}

function createAppLayout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <a class="skip-link" href="#app-main" id="skip-link">Saltar al contenido</a>
    <div class="app-layout">
      <header class="app-header" id="app-header"></header>
      <div class="app-main-wrapper">
        <aside class="app-sidebar" id="app-sidebar" aria-label="Navegación principal"></aside>
        <div class="app-content">
          <main class="app-main" id="app-main" role="main"></main>
          <footer class="app-footer">
            <p>bus-in-live · Proyecto educativo de Torogoz Studio · Santa Ana, El Salvador</p>
            <nav aria-label="Enlaces del pie de página">
              <a href="/privacidad" data-link>Privacidad</a>
              <span aria-hidden="true">·</span>
              <a href="/reportar" data-link>Reportar</a>
              <span aria-hidden="true">·</span>
              <a href="https://github.com/torogozstudio-maker/bus-in-live/issues" target="_blank" rel="noopener noreferrer" aria-label="Contacto y código (abre en una pestaña nueva)">Contacto y código</a>
            </nav>
          </footer>
        </div>
      </div>
      <nav class="app-bottom-nav" id="app-bottom-nav" aria-label="Navegación principal móvil"></nav>
      <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>
    </div>
  `;
  appContainer = app;

  // El enlace de salto no debe cambiar la URL (el router escucha popstate): solo mueve el foco.
  document.getElementById('skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('app-main');
    main.setAttribute('tabindex', '-1');
    main.focus();
  });
}

const SITE_NAME = 'bus-in-live';
const PAGE_TITLES = [
  ['/', 'bus-in-live · Transporte público colaborativo en Santa Ana'],
  ['/mapa', 'Mapa de rutas y paradas'],
  ['/rutas', 'Rutas de bus'],
  ['/paradas-cercanas', 'Paradas cercanas'],
  ['/paradas', 'Paradas'],
  ['/viajar', 'Estoy viajando'],
  ['/reportar', 'Reportar un problema'],
  ['/login', 'Iniciar sesión'],
  ['/register', 'Crear cuenta'],
  ['/reset-password', 'Restablecer contraseña'],
  ['/perfil', 'Mi perfil'],
  ['/privacidad', 'Privacidad y GPS'],
  ['/favoritos', 'Mis favoritos'],
  ['/historial', 'Historial de viajes'],
  ['/notificaciones', 'Notificaciones'],
  ['/rutas/crear', 'Crear ruta'],
  ['/reportar/desvio', 'Reportar desvío'],
  ['/terminos', 'Términos y condiciones'],
  ['/acerca', 'Acerca de bus-in-live'],
  ['/admin', 'Panel de administración'],
];

function titleFor(pathname) {
  if (pathname === '/') return PAGE_TITLES[0][1];
  const hit = PAGE_TITLES.find(([p]) => p !== '/' && (pathname === p || pathname.startsWith(p + '/')));
  return hit ? `${hit[1]} · ${SITE_NAME}` : `Página no encontrada · ${SITE_NAME}`;
}

function updateLayout() {
  const header = document.getElementById('app-header');
  const sidebar = document.getElementById('app-sidebar');
  const main = document.getElementById('app-main');
  const bottomNav = document.getElementById('app-bottom-nav');
  const overlay = document.getElementById('sidebar-overlay');

  if (isMobile) {
    header.innerHTML = renderHeader(true);
    sidebar.innerHTML = renderSidebar();
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    bottomNav.innerHTML = renderBottomNav();
    bottomNav.style.display = 'flex';
  } else {
    header.innerHTML = renderHeader(false);
    sidebar.innerHTML = renderSidebar();
    sidebar.classList.remove('collapsed');
    overlay.classList.remove('visible');
    bottomNav.innerHTML = '';
    bottomNav.style.display = 'none';
  }

  attachLayoutListeners();
}

function attachLayoutListeners() {
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const sidebarClose = document.getElementById('sidebar-close');
  const themeToggle = document.getElementById('theme-toggle');
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');

  if (menuBtn) {
    menuBtn.onclick = toggleSidebar;
  }
  if (sidebarClose) {
    sidebarClose.onclick = closeSidebar;
  }
  if (overlay) {
    overlay.onclick = closeSidebar;
  }
  if (themeToggle) {
    themeToggle.onclick = () => themeService.toggle();
  }
  if (userMenuBtn && userDropdown) {
    userMenuBtn.onclick = (e) => {
      e.stopPropagation();
      const open = userDropdown.classList.toggle('open');
      userMenuBtn.setAttribute('aria-expanded', String(open));
    };
    document.addEventListener('click', closeUserDropdown);
    if (!escapeBound) {
      escapeBound = true;
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeUserDropdown(); });
    }
  }

  // Cerrar sesión (menú de usuario y menú lateral). El evento SIGNED_OUT actualiza el layout y vuelve al inicio.
  document.querySelectorAll('#sign-out-btn, #sidebar-signout').forEach((btn) => {
    btn.onclick = async () => {
      closeSidebar();
      closeUserDropdown();
      try {
        await authService.signOut();
      } catch (error) {
        console.error('No se pudo cerrar la sesión:', error);
        toastService.error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
      }
    };
  });

  applySidebarPreference();

  // Búsqueda del header (solo escritorio). Se registra por asignación directa para
  // que cada re-render del layout reemplace los listeners viejos.
  const headerSearch = document.getElementById('header-search');
  const headerResults = document.getElementById('header-search-results');
  if (headerSearch && headerResults) {
    let searchDebounce = null;
    headerSearch.oninput = (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => handleHeaderSearch(e.target.value, headerResults), 300);
    };
    headerSearch.onfocus = () => {
      if (headerSearch.value.trim()) handleHeaderSearch(headerSearch.value, headerResults);
    };
    headerResults.onclick = (e) => {
      const a = e.target.closest('[data-link]');
      if (a) headerResults.style.display = 'none';
    };
  }

  const navLinks = document.querySelectorAll('[data-nav-link]');
  navLinks.forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        router.navigate(href);
        closeSidebar();
      }
    };
  });

  const bottomNavLinks = document.querySelectorAll('[data-bottom-nav]');
  bottomNavLinks.forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) router.navigate(href);
    };
  });
}

const SIDEBAR_KEY = 'bus-in-live-sidebar';

// En escritorio el menú lateral se puede ocultar y la preferencia se recuerda.
function applySidebarPreference() {
  let collapsed = false;
  try { collapsed = localStorage.getItem(SIDEBAR_KEY) === 'collapsed'; } catch (e) { /* sin almacenamiento */ }
  const hide = !isMobile && collapsed;
  document.body.classList.toggle('sidebar-collapsed', hide);
  const btn = document.getElementById('menu-btn');
  if (btn && !isMobile) {
    btn.setAttribute('aria-expanded', String(!hide));
    btn.setAttribute('aria-label', hide ? 'Mostrar menú lateral' : 'Ocultar menú lateral');
  }
}

function toggleSidebar() {
  if (!isMobile) {
    const hide = !document.body.classList.contains('sidebar-collapsed');
    try { localStorage.setItem(SIDEBAR_KEY, hide ? 'collapsed' : 'expanded'); } catch (e) { /* sin almacenamiento */ }
    applySidebarPreference();
    return;
  }
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

async function handleHeaderSearch(query, resultsEl) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    resultsEl.style.display = 'none';
    return;
  }
  try {
    const [{ data: routes }, { data: stops }] = await Promise.all([
      routeService.getRoutes({ city: getCurrentCity(), search: q }),
      stopService.getStops({ search: q })
    ]);
    const items = [
      ...(routes || []).map(r => ({ href: `/rutas/${r.id}`, label: `${r.code} — ${r.name}`, type: 'Ruta' })),
      ...(stops || []).map(s => ({ href: `/paradas/${s.id}`, label: s.name, type: 'Parada' }))
    ].slice(0, 8);

    if (items.length === 0) {
      resultsEl.innerHTML = '<div class="search-result-item" style="padding:10px;color:var(--muted);">Sin resultados</div>';
    } else {
      resultsEl.innerHTML = items.map(item => `
        <a href="${item.href}" data-link class="search-result-item" style="display:flex;gap:8px;align-items:center;padding:8px 12px;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);">
          <span class="badge" style="font-size:10px;">${item.type}</span>
          <span>${escapeHtml(item.label)}</span>
        </a>
      `).join('');
    }
    resultsEl.style.display = 'block';
  } catch (err) {
    console.error('Header search error:', err);
    resultsEl.style.display = 'none';
  }
}

let escapeBound = false;

function closeUserDropdown() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  const btn = document.getElementById('user-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function handleResize() {
  const wasMobile = isMobile;
  detectMobile();
  if (wasMobile !== isMobile) {
    updateLayout();
  }
}

function setupAuthListeners() {
  eventBus.on(AUTH_EVENTS.SIGNED_IN, () => {
    updateLayout();
    toastService.success('Bienvenido a bus-in-live');
  });

  eventBus.on(AUTH_EVENTS.SIGNED_OUT, () => {
    updateLayout();
    geolocationService.stopTracking();
    // Si había un viaje en curso, se cierra (endSession solo actúa cuando hay uno activo)
    if (tripSessionService.isActive()) {
      tripSessionService.endSession().catch((error) => console.error('No se pudo cerrar el viaje:', error));
    }
    router.navigate('/');
    toastService.info('Sesión cerrada');
  });

  eventBus.on(AUTH_EVENTS.USER_UPDATED, () => {
    updateLayout();
  });
}


function setupRouteGuards() {
  router.beforeEach(async (pathname) => {
    // El router ya entrega rutas internas (sin la base /bus-in-live/)
    const publicRoutes = ['/', '/login', '/register', '/reset-password', '/auth/callback', '/privacidad'];
    const isPublic = publicRoutes.some(r => pathname === r || (r !== '/' && pathname.startsWith(r + '/')));

    if (!isPublic && !authService.isAuthenticated()) {
      return '/login';
    }

    if (pathname.startsWith('/admin') && !authService.isAdmin()) {
      toastService.error('Acceso denegado: se requieren permisos de administrador');
      return '/';
    }

    return true;
  });
}

export function createApp() {
  createAppLayout();
  detectMobile();
  updateLayout();
  setupAuthListeners();
  setupRouteGuards();
  router.afterEach((route) => { document.title = titleFor(route.pathname); });
  themeService.init();
  toastService.init();

  window.addEventListener('resize', handleResize);

  const getMain = () => document.getElementById('app-main');

  // Limpieza de la página anterior antes de renderizar la nueva.
  let cleanupPrev = null;
  const render = async (importFn, route) => {
    if (typeof cleanupPrev === 'function') {
      try { cleanupPrev(); } catch (e) { /* ignorar errores de limpieza */ }
      cleanupPrev = null;
    }
    const mod = await importFn();
    await mod.renderPage(getMain(), route);
    if (typeof mod.cleanup === 'function') cleanupPrev = mod.cleanup;
  };

  router.add('/', async (route) => {
    await render(() => import('./pages/Home.js'), route);
  });
  router.add('/login', async (route) => {
    await render(() => import('./pages/Login.js'), route);
  });
  router.add('/register', async (route) => {
    await render(() => import('./pages/Register.js'), route);
  });
  router.add('/reset-password', async (route) => {
    await render(() => import('./pages/ResetPassword.js'), route);
  });
  router.add('/auth/callback', async (route) => {
    await render(() => import('./pages/AuthCallback.js'), route);
  });
  router.add('/mapa', async (route) => {
    await render(() => import('./pages/Mapa.js'), route);
  });
  router.add('/rutas', async (route) => {
    await render(() => import('./pages/Rutas.js'), route);
  });
  // IMPORTANTE: /rutas/crear y /rutas/:id/editar deben ir ANTES de /rutas/:id
  // para que el router no las interprete como un id.
  router.add('/rutas/crear', async (route) => {
    await render(() => import('./pages/CrearRuta.js'), route);
  });
  router.add('/rutas/:id/editar', async (route) => {
    await render(() => import('./pages/EditarRuta.js'), route);
  });
  router.add('/rutas/:id', async (route) => {
    await render(() => import('./pages/RutaDetalle.js'), route);
  });
  router.add('/paradas', async (route) => {
    await render(() => import('./pages/Paradas.js'), route);
  });
  router.add('/paradas/:id', async (route) => {
    await render(() => import('./pages/ParadaDetalle.js'), route);
  });
  router.add('/paradas-cercanas', async (route) => {
    await render(() => import('./pages/ParadasCercanas.js'), route);
  });
  router.add('/viajar', async (route) => {
    await render(() => import('./pages/Viajar.js'), route);
  });
  router.add('/reportar', async (route) => {
    await render(() => import('./pages/Reportar.js'), route);
  });
  router.add('/reportar/desvio', async (route) => {
    // Alias: renderiza /reportar con el tipo "detour" preseleccionado por query.
    const query = new URLSearchParams(route.query);
    query.set('type', 'detour');
    await render(() => import('./pages/Reportar.js'), { ...route, query });
  });
  router.add('/favoritos', async (route) => {
    await render(() => import('./pages/Favoritos.js'), route);
  });
  router.add('/historial', async (route) => {
    await render(() => import('./pages/Historial.js'), route);
  });
  router.add('/perfil', async (route) => {
    await render(() => import('./pages/Perfil.js'), route);
  });
  router.add('/privacidad', async (route) => {
    await render(() => import('./pages/Privacidad.js'), route);
  });
  router.add('/notificaciones', async (route) => {
    await render(() => import('./pages/Notificaciones.js'), route);
  });
  // Páginas informativas enlazadas desde Home y Register
  router.add('/terminos', async (route) => {
    await render(() => import('./pages/Proximamente.js'), { ...route, params: { title: 'Términos y condiciones', text: 'Los términos y condiciones completos estarán disponibles próximamente. Al usar bus-in-live aceptas que los datos que compartes se usan de forma anónima para mejorar el transporte público.' } });
  });
  router.add('/acerca', async (route) => {
    await render(() => import('./pages/Proximamente.js'), { ...route, params: { title: 'Acerca de bus-in-live', text: 'bus-in-live es un proyecto educativo de Torogoz Studio para mejorar el transporte público en Santa Ana, El Salvador mediante la colaboración de la comunidad.' } });
  });
  router.add('/admin', async (route) => {
    await render(() => import('./pages/AdminDashboard.js'), route);
  });
  router.add('/admin/rutas', async (route) => {
    await render(() => import('./pages/AdminRutas.js'), route);
  });
  router.add('/admin/reportes', async (route) => {
    await render(() => import('./pages/AdminReportes.js'), route);
  });
  router.add('/admin/incidencias', async (route) => {
    await render(() => import('./pages/AdminIncidencias.js'), route);
  });
  router.add('/admin/solicitudes', async (route) => {
    await render(() => import('./pages/AdminSolicitudes.js'), route);
  });

  router.notFound(async () => {
    const main = getMain();
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 class="empty-state-title">Página no encontrada</h2>
        <p class="empty-state-text">La página que buscas no existe.</p>
        <button class="btn btn-primary" style="margin-top:16px;" data-link="/" data-nav-link>Ir al inicio</button>
      </div>
    `;
  });
}