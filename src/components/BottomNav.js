import { authService } from '../services/auth.js';

const bottomNavItems = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/mapa', label: 'Mapa', icon: 'map' },
  { href: '/rutas', label: 'Rutas', icon: 'bus' },
  { href: '/paradas-cercanas', label: 'Cercanas', icon: 'map-pin' },
  { href: '/viajar', label: 'Viajar', icon: 'navigation' }
];

export function renderBottomNav() {
  const isAuth = authService.isAuthenticated();

  return `
    <nav class="bottom-nav" role="navigation" aria-label="Navegación principal">
      ${bottomNavItems.map(item => `
        <a href="${item.href}" data-bottom-nav class="bottom-nav-item ${isCurrentRoute(item.href) ? 'active' : ''}">
          <svg class="bottom-nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIcon(item.icon)}</svg>
          <span class="bottom-nav-label">${item.label}</span>
        </a>
      `).join('')}
      ${isAuth ? `
        <div class="bottom-nav-divider"></div>
        <a href="/reportar" data-bottom-nav class="bottom-nav-item bottom-nav-action">
          <svg class="bottom-nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <span class="bottom-nav-label">Reportar</span>
        </a>
      ` : ''}
    </nav>
  `;
}

function isCurrentRoute(href) {
  return window.location.pathname === href || window.location.pathname.startsWith(href + '/');
}

function getIcon(name) {
  const icons = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line>',
    bus: '<path d="M8 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6Z"></path><path d="M6 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"></path><circle cx="10" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>'
  };
  return icons[name] || icons.home;
}