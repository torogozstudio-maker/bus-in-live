import { authService } from '../services/auth.js';
import { router } from '../utils/router.js';

export function renderHeader(isMobile) {
  const user = authService.getUser();
  const isAuth = authService.isAuthenticated();

  // Acciones rápidas para el header (no menú completo - eso está en sidebar)
  const quickActions = [
    { href: '/viajar', label: 'Estoy viajando', icon: 'navigation', primary: true },
    { href: '/reportar', label: 'Reportar', icon: 'alert-triangle' }
  ];

  const adminQuickActions = [
    { href: '/admin', label: 'Admin', icon: 'layout-dashboard' }
  ];

  function renderQuickActions(items) {
    return items.map(item => `
      <a href="${item.href}" data-nav-link class="btn ${item.primary ? 'btn-primary' : 'btn-secondary'} btn-sm">
        <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIcon(item.icon)}</svg>
        <span>${item.label}</span>
      </a>
    `).join('');
  }

  return `
    <div class="header-container">
      <div class="header-left">
        ${isMobile ? `
          <button id="menu-btn" class="btn btn-ghost btn-icon" aria-label="Abrir menú" aria-expanded="false">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        ` : ''}
        <a href="/" class="header-brand" data-link>
          <svg class="brand-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
          <span class="brand-text">bus-in-live</span>
        </a>
      </div>

      ${!isMobile ? `
        <div class="header-center">
          <div class="header-search">
            <label for="header-search" class="sr-only">Buscar ruta</label>
            <input type="text" id="header-search" class="form-input" placeholder="Buscar ruta, parada..." autocomplete="off" style="width: 300px;">
            <div id="header-search-results" class="search-results" style="display: none;"></div>
          </div>
        </div>
      ` : ''}

      <div class="header-right">
        <button id="theme-toggle" class="btn btn-ghost btn-icon" aria-label="Cambiar tema">
          <svg class="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <svg class="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </button>

        ${isAuth ? `
          <div class="header-actions">
            ${renderQuickActions(quickActions)}
            ${authService.isAdmin() ? renderQuickActions(adminQuickActions) : ''}
          </div>
          <div class="user-menu" style="position: relative; margin-left: 12px;">
            <button id="user-menu-btn" class="btn btn-ghost user-menu-btn" aria-label="Menú de usuario" aria-expanded="false" aria-haspopup="true">
              <div class="avatar avatar-sm" style="background-color: var(--primary);">${user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}</div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="user-dropdown" class="dropdown-menu" role="menu" style="display: none; min-width: 220px;">
              <div class="dropdown-header" style="padding: 12px 16px; border-bottom: 1px solid var(--border);">
                <div style="font-weight: 600; font-size: var(--text-sm);">${user?.name || 'Usuario'}</div>
                <div style="font-size: var(--text-xs); color: var(--muted);">${user?.email}</div>
                ${user?.role === 'admin' ? '<span class="badge badge-primary" style="margin-top: 4px; font-size: 10px;">Administrador</span>' : ''}
              </div>
              <a href="/favoritos" class="dropdown-item" role="menuitem" data-nav-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Favoritos
              </a>
              <a href="/historial" class="dropdown-item" role="menuitem" data-nav-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v6l4 4"></path><path d="M12 3a10 10 0 1 1 9.54 13.6"></path></svg>
                Historial
              </a>
              <a href="/perfil" class="dropdown-item" role="menuitem" data-nav-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Perfil
              </a>
              <a href="/privacidad" class="dropdown-item" role="menuitem" data-nav-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Privacidad y GPS
              </a>
              <a href="/notificaciones" class="dropdown-item" role="menuitem" data-nav-link>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                Notificaciones
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item dropdown-item-danger" role="menuitem" id="sign-out-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        ` : `
          <div class="header-auth">
            <a href="/login" class="btn btn-ghost btn-sm" data-link>Iniciar sesión</a>
            <a href="/register" class="btn btn-primary btn-sm" data-link>Registrarse</a>
          </div>
        `}
      </div>
    </div>
  `;
}

function getIcon(name) {
  const icons = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line>',
    bus: '<path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><path d="M6 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"></path><circle cx="10" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>',
    'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    layout: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
    'alert-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
    'clipboard-list': '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path><line x1="9" y1="15" x2="19" y2="15"></line><line x1="9" y1="19" x2="15" y2="19"></line>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    history: '<path d="M12 3v6l4 4"></path><path d="M12 3a10 10 0 1 1 9.54 13.6"></path>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>'
  };
  return icons[name] || icons.home;
}