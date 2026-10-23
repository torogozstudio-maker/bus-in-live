import { authService } from '../services/auth.js';
import { stripBase } from '../utils/router.js';
import { escapeHtml } from '../utils/sanitize.js';

const mainNavItems = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/mapa', label: 'Mapa', icon: 'map' },
  { href: '/rutas', label: 'Rutas', icon: 'bus' },
  { href: '/paradas-cercanas', label: 'Paradas cercanas', icon: 'map-pin' },
  { href: '/viajar', label: 'Estoy viajando', icon: 'navigation' },
  { href: '/reportar', label: 'Reportar problema', icon: 'alert-triangle' }
];

const userNavItems = [
  { href: '/favoritos', label: 'Favoritos', icon: 'star' },
  { href: '/historial', label: 'Historial', icon: 'history' },
  { href: '/perfil', label: 'Perfil', icon: 'user' },
  { href: '/privacidad', label: 'Privacidad y GPS', icon: 'shield' },
  { href: '/notificaciones', label: 'Notificaciones', icon: 'bell' }
];

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/admin/rutas', label: 'Gestión de rutas', icon: 'bus' },
  { href: '/admin/reportes', label: 'Gestión de reportes', icon: 'file-text' },
  { href: '/admin/incidencias', label: 'Gestión de incidencias', icon: 'alert-circle' },
  { href: '/admin/solicitudes', label: 'Solicitudes de cambios', icon: 'clipboard-list' }
];

export function renderSidebar() {
  const user = authService.getUser();
  const isAuth = authService.isAuthenticated();

  return `
    <div class="sidebar-container">
      <div class="sidebar-header">
        <a href="/" class="sidebar-brand" data-nav-link>
          <svg class="sidebar-brand-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
          <span>bus-in-live</span>
        </a>
        <button id="sidebar-close" class="btn btn-ghost btn-icon sidebar-close-btn" aria-label="Cerrar menú">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <nav class="sidebar-nav" role="navigation" aria-label="Navegación principal">
        <div class="sidebar-section">
          <h3 class="sidebar-section-title">Principal</h3>
          <ul class="sidebar-list">
            ${mainNavItems.map(item => `
              <li>
                <a href="${item.href}" data-nav-link class="sidebar-link ${isCurrentRoute(item.href) ? 'active' : ''}">
                  <svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIcon(item.icon)}</svg>
                  <span>${item.label}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>

        ${isAuth ? `
          <div class="sidebar-section">
            <h3 class="sidebar-section-title">Tu cuenta</h3>
            <ul class="sidebar-list">
              ${userNavItems.map(item => `
                <li>
                  <a href="${item.href}" data-nav-link class="sidebar-link ${isCurrentRoute(item.href) ? 'active' : ''}">
                    <svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIcon(item.icon)}</svg>
                    <span>${item.label}</span>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${authService.isAdmin() ? `
          <div class="sidebar-section">
            <h3 class="sidebar-section-title">Administración</h3>
            <ul class="sidebar-list">
              ${adminNavItems.map(item => `
                <li>
                  <a href="${item.href}" data-nav-link class="sidebar-link ${isCurrentRoute(item.href) ? 'active' : ''}">
                    <svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIcon(item.icon)}</svg>
                    <span>${item.label}</span>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        ${isAuth ? `
          <div class="sidebar-user">
            <div class="avatar" style="background-color: var(--primary-action);">${escapeHtml(user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U')}</div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">${escapeHtml(user?.name || 'Usuario')}</div>
              <div class="sidebar-user-email">${escapeHtml(user?.email)}</div>
              ${user?.role === 'admin' ? '<span class="badge badge-primary" style="font-size: 10px;">Administrador</span>' : ''}
            </div>
          </div>
          <button id="sidebar-signout" class="btn btn-ghost btn-full sidebar-signout">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Cerrar sesión
          </button>
        ` : `
          <div class="sidebar-auth">
            <a href="/login" class="btn btn-ghost btn-full" data-nav-link>Iniciar sesión</a>
            <a href="/register" class="btn btn-primary btn-full" data-nav-link>Registrarse</a>
          </div>
        `}
      </div>
    </div>
  `;
}

function isCurrentRoute(href) {
  const path = stripBase(window.location.pathname);
  return path === href || (href !== '/' && path.startsWith(href + '/'));
}

function getIcon(name) {
  const icons = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line>',
    bus: '<path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><path d="M6 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"></path><circle cx="10" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>',
    'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    'layout-dashboard': '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
    'alert-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
    'clipboard-list': '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path><line x1="9" y1="15" x2="19" y2="15"></line><line x1="9" y1="19" x2="15" y2="19"></line>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>'
  };
  return icons[name] || icons.home;
}