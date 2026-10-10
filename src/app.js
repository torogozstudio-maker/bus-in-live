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
    <div class="app-layout">
      <header class="app-header" id="app-header"></header>
      <div class="app-main-wrapper">
        <aside class="app-sidebar" id="app-sidebar" aria-label="Navegación principal"></aside>
        <main class="app-main" id="app-main" role="main"></main>
      </div>
      <nav class="app-bottom-nav" id="app-bottom-nav" aria-label="Navegación principal móvil"></nav>
      <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>
    </div>
  `;
  appContainer = app;
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
      userDropdown.classList.toggle('open');
    };
    document.addEventListener('click', closeUserDropdown);
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

function toggleSidebar() {
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

function closeUserDropdown() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.remove('open');
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
    tripSessionService.endCurrentSession();
    router.navigate('/');
    toastService.info('Sesión cerrada');
  });

  eventBus.on(AUTH_EVENTS.USER_UPDATED, () => {
    updateLayout();
  });
}

function setupRouteGuards() {
  router.beforeEach(async (pathname) => {
    const publicRoutes = ['/', '/login', '/register', '/reset-password', '/auth/callback'];
    const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

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
  // router.add('/reportar/desvio', async (route) => {
  //   const { renderPage: render } = await import('./pages/ReportarDesvio.js');
  //   await render(getMain(), route);
  // });
  // router.add('/rutas/crear', async (route) => {
  //   const { renderPage: render } = await import('./pages/CrearRuta.js');
  //   await render(getMain(), route);
  // });
  // router.add('/rutas/:id/editar', async (route) => {
  //   const { renderPage: render } = await import('./pages/EditarRuta.js');
  //   await render(getMain(), route);
  // });
  // router.add('/favoritos', async (route) => {
  //   const { renderPage: render } = await import('./pages/Favoritos.js');
  //   await render(getMain(), route);
  // });
  // router.add('/historial', async (route) => {
  //   const { renderPage: render } = await import('./pages/Historial.js');
  //   await render(getMain(), route);
  // });
  // router.add('/perfil', async (route) => {
  //   const { renderPage: render } = await import('./pages/Perfil.js');
  //   await render(getMain(), route);
  // });
  // router.add('/privacidad', async (route) => {
  //   const { renderPage: render } = await import('./pages/Privacidad.js');
  //   await render(getMain(), route);
  // });
  // router.add('/notificaciones', async (route) => {
  //   const { renderPage: render } = await import('./pages/Notificaciones.js');
  //   await render(getMain(), route);
  // });
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
        <button class="btn btn-primary" style="margin-top:16px;" onclick="router.navigate('/')">Ir al inicio</button>
      </div>
    `;
  });
}