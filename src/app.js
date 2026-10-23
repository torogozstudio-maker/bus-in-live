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
  ['/rutas/editar', 'Editar ruta'],
  ['/reportar/desvio', 'Reportar desvío'],
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

  router.add('/', async (route) => {
    const { renderPage: render } = await import('./pages/Home.js');
    await render(getMain(), route);
  });
  router.add('/login', async (route) => {
    const { renderPage: render } = await import('./pages/Login.js');
    await render(getMain(), route);
  });
  router.add('/register', async (route) => {
    const { renderPage: render } = await import('./pages/Register.js');
    await render(getMain(), route);
  });
  router.add('/reset-password', async (route) => {
    const { renderPage: render } = await import('./pages/ResetPassword.js');
    await render(getMain(), route);
  });
  router.add('/auth/callback', async (route) => {
    const { renderPage: render } = await import('./pages/AuthCallback.js');
    await render(getMain(), route);
  });
  router.add('/mapa', async (route) => {
    const { renderPage: render } = await import('./pages/Mapa.js');
    await render(getMain(), route);
  });
  router.add('/rutas', async (route) => {
    const { renderPage: render } = await import('./pages/Rutas.js');
    await render(getMain(), route);
  });
  router.add('/rutas/:id', async (route) => {
    const { renderPage: render } = await import('./pages/RutaDetalle.js');
    await render(getMain(), route);
  });
  router.add('/paradas', async (route) => {
    const { renderPage: render } = await import('./pages/Paradas.js');
    await render(getMain(), route);
  });
  router.add('/paradas/:id', async (route) => {
    const { renderPage: render } = await import('./pages/ParadaDetalle.js');
    await render(getMain(), route);
  });
  router.add('/paradas-cercanas', async (route) => {
    const { renderPage: render } = await import('./pages/ParadasCercanas.js');
    await render(getMain(), route);
  });
  router.add('/viajar', async (route) => {
    const { renderPage: render } = await import('./pages/Viajar.js');
    await render(getMain(), route);
  });
  router.add('/reportar', async (route) => {
    const { renderPage: render } = await import('./pages/Reportar.js');
    await render(getMain(), route);
  });
  router.add('/reportar/desvio', async (route) => {
    const { renderPage: render } = await import('./pages/Proximamente.js');
    await render(getMain(), { ...route, params: { title: 'Reportar desvío', text: 'Esta función estará disponible próximamente. Por ahora puedes reportar un desvío desde la página de Reportar.' } });
  });
  router.add('/rutas/crear', async (route) => {
    const { renderPage: render } = await import('./pages/Proximamente.js');
    await render(getMain(), { ...route, params: { title: 'Crear ruta', text: 'Esta función estará disponible próximamente para colaboradores verificados.' } });
  });
  router.add('/rutas/:id/editar', async (route) => {
    const { renderPage: render } = await import('./pages/Proximamente.js');
    await render(getMain(), { ...route, params: { title: 'Editar ruta', text: 'Esta función estará disponible próximamente para administradores.' } });
  });
  router.add('/favoritos', async (route) => {
    const { renderPage: render } = await import('./pages/Favoritos.js');
    await render(getMain(), route);
  });
  router.add('/historial', async (route) => {
    const { renderPage: render } = await import('./pages/Proximamente.js');
    await render(getMain(), { ...route, params: { title: 'Historial de viajes', text: 'Tu historial de viajes estará disponible en una próxima actualización.' } });
  });
  router.add('/perfil', async (route) => {
    const { renderPage: render } = await import('./pages/Perfil.js');
    await render(getMain(), route);
  });
  router.add('/privacidad', async (route) => {
    const { renderPage: render } = await import('./pages/Privacidad.js');
    await render(getMain(), route);
  });
  router.add('/notificaciones', async (route) => {
    const { renderPage: render } = await import('./pages/Proximamente.js');
    await render(getMain(), { ...route, params: { title: 'Notificaciones', text: 'Las notificaciones estarán disponibles en una próxima actualización.' } });
  });
  router.add('/admin', async (route) => {
    const { renderPage: render } = await import('./pages/AdminDashboard.js');
    await render(getMain(), route);
  });
  router.add('/admin/rutas', async (route) => {
    const { renderPage: render } = await import('./pages/AdminRutas.js');
    await render(getMain(), route);
  });
  router.add('/admin/reportes', async (route) => {
    const { renderPage: render } = await import('./pages/AdminReportes.js');
    await render(getMain(), route);
  });
  router.add('/admin/incidencias', async (route) => {
    const { renderPage: render } = await import('./pages/AdminIncidencias.js');
    await render(getMain(), route);
  });
  router.add('/admin/solicitudes', async (route) => {
    const { renderPage: render } = await import('./pages/AdminSolicitudes.js');
    await render(getMain(), route);
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